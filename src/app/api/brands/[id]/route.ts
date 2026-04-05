import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const data = await req.json();
  const brand = await prisma.brand.update({ where: { id }, data });
  return NextResponse.json(brand);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const productsCount = await prisma.product.count({ where: { brandId: id } });
  if (productsCount > 0) {
    return NextResponse.json({ error: `Нельзя удалить: ${productsCount} товаров этого бренда` }, { status: 400 });
  }
  await prisma.brand.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
