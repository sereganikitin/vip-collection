import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { notifyPaymentStatusChange } from '@/lib/telegram';

const ALLOWED_PAYMENT_STATUS = new Set(['pending', 'paid', 'failed', 'refunded']);

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (typeof body.status === 'string') data.status = body.status;

  let paymentStatusUpdate: string | null = null;
  if (typeof body.paymentStatus === 'string' && ALLOWED_PAYMENT_STATUS.has(body.paymentStatus)) {
    paymentStatusUpdate = body.paymentStatus;
    data.paymentStatus = body.paymentStatus;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Нет полей для обновления' }, { status: 400 });
  }

  // Fetch the existing row once to (1) drive paidAt logic and (2) know the
  // pre-update payment status for the Telegram notification.
  const existing = await prisma.order.findUnique({
    where: { id },
    select: {
      number: true,
      customerName: true,
      customerPhone: true,
      totalPrice: true,
      paymentMethod: true,
      paymentStatus: true,
      paidAt: true,
    },
  });

  if (paymentStatusUpdate === 'paid' && existing && !existing.paidAt) {
    data.paidAt = new Date();
  }

  const order = await prisma.order.update({
    where: { id },
    data,
    include: { items: { include: { product: true } } },
  });

  if (
    paymentStatusUpdate &&
    existing &&
    existing.paymentStatus !== paymentStatusUpdate
  ) {
    notifyPaymentStatusChange({
      orderNumber: existing.number,
      customerName: existing.customerName,
      customerPhone: existing.customerPhone,
      totalPrice: existing.totalPrice,
      paymentMethod: existing.paymentMethod,
      oldStatus: existing.paymentStatus,
      newStatus: paymentStatusUpdate,
      source: 'admin',
    }).catch((e) => console.error('admin notify TG:', e));
  }

  return NextResponse.json(order);
}
