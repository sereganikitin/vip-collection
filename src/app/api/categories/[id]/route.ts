import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const data = await req.json();
  const category = await prisma.category.update({ where: { id }, data });
  return NextResponse.json(category);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const productsCount = await prisma.product.count({ where: { categoryId: id } });
  if (productsCount > 0) {
    return NextResponse.json({ error: `Нельзя удалить: ${productsCount} товаров в этой категории` }, { status: 400 });
  }
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
