// POST /api/orders/[id]/refund
//
// Возврат денег клиенту через Тинькофф /Cancel по сохранённому PaymentId.
// При успехе устанавливает paymentStatus='refunded' и status='CANCELLED'.
// Body (опционально): { amountRub: number } — для частичного возврата.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { tinkoffCancel } from '@/lib/tinkoff';
import { notifyPaymentStatusChange } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      number: true,
      customerName: true,
      customerPhone: true,
      totalPrice: true,
      paymentMethod: true,
      paymentStatus: true,
      paymentId: true,
    },
  });
  if (!order) return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });

  if (order.paymentMethod !== 'online') {
    return NextResponse.json(
      { ok: false, error: 'Возврат через Тинькофф возможен только для онлайн-оплаты' },
      { status: 400 }
    );
  }
  if (order.paymentStatus !== 'paid') {
    return NextResponse.json(
      { ok: false, error: `Возврат возможен только для оплаченного заказа. Текущий статус: ${order.paymentStatus}` },
      { status: 400 }
    );
  }
  if (!order.paymentId) {
    return NextResponse.json(
      { ok: false, error: 'У заказа не сохранён PaymentId Тинькоффа — возврат через API невозможен, верните через ЛК' },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const amountRub: number | undefined =
    typeof body.amountRub === 'number' && body.amountRub > 0 ? body.amountRub : undefined;

  // Шлём в Тинькофф. Если amountRub не задан — возвращается вся сумма платежа.
  const result = await tinkoffCancel(order.paymentId, amountRub);

  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }

  // Обновляем БД: статус оплаты в refunded, заказ переходит в CANCELLED.
  await prisma.order.update({
    where: { id },
    data: {
      paymentStatus: 'refunded',
      status: 'CANCELLED',
    },
  });

  // TG-уведомление
  notifyPaymentStatusChange({
    orderNumber: order.number,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    totalPrice: amountRub ?? order.totalPrice,
    paymentMethod: order.paymentMethod,
    oldStatus: order.paymentStatus,
    newStatus: 'refunded',
    source: 'admin',
  }).catch((e) => console.error('refund TG notify:', e));

  return NextResponse.json({
    ok: true,
    newStatus: result.newStatus,
    refundedRub: amountRub ?? order.totalPrice,
  });
}
