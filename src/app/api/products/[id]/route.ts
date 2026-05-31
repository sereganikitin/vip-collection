import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { pingIndexNow, pingProduct, pingCategory } from '@/lib/indexnow';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true, brand: true },
  });
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(product);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const data = await req.json();
  const product = await prisma.product.update({
    where: { id },
    data,
    include: { category: true, brand: true },
  });

  // IndexNow: пингуем обновлённый товар и его категорию
  void pingProduct(product.slug);
  if (product.category?.slug) void pingCategory(product.category.slug);

  return NextResponse.json(product);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  // Заберём slug до удаления, чтобы пингнуть Яндекс на 404 → удалит из индекса
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });
  await prisma.product.delete({ where: { id } });

  if (product) {
    void pingIndexNow([`/product/${product.slug}`]);
    if (product.category?.slug) void pingCategory(product.category.slug);
  }

  return NextResponse.json({ success: true });
}
