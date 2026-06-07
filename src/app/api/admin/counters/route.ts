import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [ordersNew, feedbackUnread, wholesaleUnread] = await Promise.all([
    prisma.order.count({ where: { status: 'NEW' } }),
    prisma.feedback.count({ where: { isRead: false } }),
    prisma.wholesaleRequest.count({ where: { isRead: false } }),
  ]);

  return NextResponse.json({ ordersNew, feedbackUnread, wholesaleUnread });
}
