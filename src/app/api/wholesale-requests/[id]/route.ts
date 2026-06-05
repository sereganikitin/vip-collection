// PATCH /api/wholesale-requests/[id] — toggle isRead
// DELETE /api/wholesale-requests/[id] — удалить заявку
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const data = await req.json().catch(() => ({}));
  const update: { isRead?: boolean } = {};
  if (typeof data.isRead === 'boolean') update.isRead = data.isRead;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }
  const wr = await prisma.wholesaleRequest.update({ where: { id }, data: update });
  return NextResponse.json(wr);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  await prisma.wholesaleRequest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
