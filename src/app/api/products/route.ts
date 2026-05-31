import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { pingProduct, pingCategory, pingHome } from '@/lib/indexnow';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const categorySlug = searchParams.get('category');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

  const where: Record<string, unknown> = { isActive: true };

  if (categorySlug) {
    where.category = { slug: categorySlug };
  }
  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true, brand: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({ products, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const data = await req.json();
  const product = await prisma.product.create({ data, include: { category: true, brand: true } });

  // IndexNow: пингуем новый товар + категорию + главную (товар может попасть
  // в «Новинки»/«Популярные»). Без await — не блокируем ответ админке.
  void pingProduct(product.slug);
  if (product.category?.slug) void pingCategory(product.category.slug);
  void pingHome();

  return NextResponse.json(product, { status: 201 });
}
