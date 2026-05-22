import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

const ALLOWED_PAYMENT_STATUS = new Set(['pending', 'paid', 'failed', 'refunded']);

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (typeof body.status === 'string') data.status = body.status;
  if (typeof body.paymentStatus === 'string' && ALLOWED_PAYMENT_STATUS.has(body.paymentStatus)) {
    data.paymentStatus = body.paymentStatus;
    if (body.paymentStatus === 'paid') {
      const existing = await prisma.order.findUnique({ where: { id }, select: { paidAt: true } });
      if (existing && !existing.paidAt) data.paidAt = new Date();
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Нет полей для обновления' }, { status: 400 });
  }

  const order = await prisma.order.update({
    where: { id },
    data,
    include: { items: { include: { product: true } } },
  });
  return NextResponse.json(order);
}
