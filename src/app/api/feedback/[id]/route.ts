// PATCH /api/feedback/[id]   — пометить прочитанным/непрочитанным
// DELETE /api/feedback/[id]  — удалить обращение
// Оба требуют авторизованного админа.

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

  const fb = await prisma.feedback.update({ where: { id }, data: update });
  return NextResponse.json(fb);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await prisma.feedback.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
