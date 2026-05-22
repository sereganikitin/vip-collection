import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { tinkoffInit } from '@/lib/tinkoff';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

// GET /api/payment/tinkoff/init?orderId=XXX → redirects user to Tinkoff payment page.
// We re-use a saved paymentUrl if Init was already called for this order.
export async function GET(req: NextRequest) {
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

  const result = await tinkoffInit({
    orderId: order.id,
    amountRub: order.totalPrice,
    description: `Заказ №${order.number} на vipcoll.ru`,
    notificationURL: `${SITE_URL}/api/payment/tinkoff/notify`,
    successURL: `${SITE_URL}/checkout/success?orderId=${order.id}`,
    failURL: `${SITE_URL}/checkout/fail?orderId=${order.id}`,
    customerEmail: order.customerEmail ?? undefined,
    customerPhone: order.customerPhone,
    items: order.items.map((it) => ({
      name: it.product.name,
      quantity: it.quantity,
      priceRub: it.price,
    })),
  });

  if (!result) {
    return NextResponse.redirect(`${SITE_URL}/checkout/fail?orderId=${order.id}&reason=init-failed`);
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { paymentId: result.paymentId, paymentUrl: result.paymentUrl },
  });

  return NextResponse.redirect(result.paymentUrl);
}
