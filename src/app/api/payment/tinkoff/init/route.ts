import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { tinkoffInit } from '@/lib/tinkoff';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

// GET /api/payment/tinkoff/init?orderId=XXX → redirects user to Tinkoff payment page.
// We re-use a saved paymentUrl if Init was already called for this order.
export async function GET(req: NextRequest) {
  const tStart = Date.now();
  const stage = (label: string) => console.log(`[tinkoff init] ${label}: +${Date.now() - tStart}ms`);

  const orderId = req.nextUrl.searchParams.get('orderId');
  if (!orderId) {
    return NextResponse.redirect(`${SITE_URL}/checkout/fail?reason=missing-order`);
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });
  if (!order) {
    return NextResponse.redirect(`${SITE_URL}/checkout/fail?reason=order-not-found`);
  }

  // Already paid — straight to success
  if (order.paymentStatus === 'paid') {
    return NextResponse.redirect(`${SITE_URL}/checkout/success?orderId=${order.id}`);
  }

  // Re-use existing payment URL if Init was already done and link is still valid
  if (order.paymentUrl && order.paymentStatus === 'pending') {
    return NextResponse.redirect(order.paymentUrl);
  }

  // Тинькофф запрещает дважды использовать один и тот же OrderId. Если Init
  // вызывался раньше (у заказа уже есть paymentId), добавляем уникальный
  // суффикс — webhook /notify умеет вырезать его обратно по `split('-')[0]`.
  const initOrderId = order.paymentId
    ? `${order.id}-${Date.now().toString(36)}`
    : order.id;

  // Тинькофф требует, чтобы сумма позиций Receipt.Items совпадала с Amount.
  // Если у заказа есть стоимость доставки — добавляем её отдельной позицией.
  //
  // isAgentItem помечает позиции, которые продаются по агентскому договору
  // (товары принципала). К ним Тинькофф добавит признак агента и реквизиты
  // принципала, если в /admin/settings включён агент-режим. Доставка —
  // наша собственная услуга, поэтому isAgentItem=false.
  const receiptItems: Array<{
    name: string;
    quantity: number;
    priceRub: number;
    isAgentItem: boolean;
    isService?: boolean;
  }> = order.items.map((it) => ({
    name: it.product.name,
    quantity: it.quantity,
    priceRub: it.price,
    isAgentItem: true,
    isService: false,
  }));
  if (order.deliveryPrice && order.deliveryPrice > 0) {
    receiptItems.push({
      name: 'Доставка',
      quantity: 1,
      priceRub: order.deliveryPrice,
      isAgentItem: false,
      isService: true, // PaymentObject='service' для доставки
    });
  }

  const result = await tinkoffInit({
    orderId: initOrderId,
    amountRub: order.totalPrice,
    description: `Заказ №${order.number} на vipcoll.ru`,
    notificationURL: `${SITE_URL}/api/payment/tinkoff/notify`,
    successURL: `${SITE_URL}/checkout/success?orderId=${order.id}`,
    failURL: `${SITE_URL}/checkout/fail?orderId=${order.id}`,
    customerEmail: order.customerEmail ?? undefined,
    customerPhone: order.customerPhone,
    items: receiptItems,
  });
  stage('tinkoffInit done');

  if (!result) {
    return NextResponse.redirect(`${SITE_URL}/checkout/fail?orderId=${order.id}&reason=init-failed`);
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentId: result.paymentId,
      paymentUrl: result.paymentUrl,
      paymentStatus: 'pending',
    },
  });
  stage('redirecting to Tinkoff');

  return NextResponse.redirect(result.paymentUrl);
}
