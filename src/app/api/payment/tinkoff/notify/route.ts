import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyNotificationToken, mapTinkoffStatusToLocal } from '@/lib/tinkoff';

export const dynamic = 'force-dynamic';

// Tinkoff sends server-to-server POST with JSON body for every status change.
// We must return the literal string "OK" with HTTP 200 on success — otherwise
// Tinkoff will retry up to ~24h.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return new Response('BAD', { status: 400 });
  }

  const valid = await verifyNotificationToken(body);
  if (!valid) {
    console.warn('Tinkoff notify: invalid token', body);
    return new Response('BAD', { status: 400 });
  }

  const orderId = String(body.OrderId ?? '');
  const status = String(body.Status ?? '');
  const paymentId = body.PaymentId ? String(body.PaymentId) : undefined;
  if (!orderId) {
    return new Response('BAD', { status: 400 });
  }

  const local = mapTinkoffStatusToLocal(status);
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      console.warn('Tinkoff notify: order not found', orderId);
      return new Response('OK', { status: 200 }); // still ACK
    }
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: local,
        ...(paymentId ? { paymentId } : {}),
        ...(local === 'paid' && !order.paidAt ? { paidAt: new Date() } : {}),
      },
    });
    console.log(`Tinkoff notify: order ${orderId} → ${status} (${local})`);
  } catch (e) {
    console.error('Tinkoff notify DB error:', e);
    // Still return OK so Tinkoff stops retrying; we logged the error.
  }

  return new Response('OK', { status: 200 });
}
