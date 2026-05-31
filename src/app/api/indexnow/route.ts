// POST /api/indexnow — ручной пинг IndexNow для админки.
// Тело: { urls: ["/product/...", "/catalog/...", "/"] }
//   или { all: true } — для разового «прогрева» всего сайта.
//
// Защита: только авторизованный админ.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { pingIndexNow } from '@/lib/indexnow';
import { BRAND_SLUGS } from '@/data/brand-content';
import { getAllVariantPairs } from '@/data/subcategory-content';
import { GUIDE_SLUGS } from '@/data/guides';

export const dynamic = 'force-dynamic';

async function buildAllUrls(): Promise<string[]> {
  const urls = new Set<string>([
    '/',
    '/about',
    '/delivery',
    '/pickup',
    '/repair',
    '/wholesale',
    '/contacts',
    '/blog',
  ]);

  // Бренд-хабы
  BRAND_SLUGS.forEach((s) => urls.add(`/brand/${s}`));
  // Гайды
  GUIDE_SLUGS.forEach((s) => urls.add(`/blog/${s}`));
  // Подборки внутри категорий
  getAllVariantPairs().forEach((p) => urls.add(`/catalog/${p.categorySlug}/${p.variantSlug}`));

  // Категории и товары из БД
  try {
    const [cats, prods] = await Promise.all([
      prisma.category.findMany({ where: { isActive: true }, select: { slug: true } }),
      prisma.product.findMany({ where: { isActive: true }, select: { slug: true } }),
    ]);
    cats.forEach((c) => urls.add(`/catalog/${c.slug}`));
    prods.forEach((p) => urls.add(`/product/${p.slug}`));
  } catch (e) {
    console.error('[indexnow] failed to load urls:', e);
  }

  return Array.from(urls);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  let urls: string[];
  if (body.all === true) {
    urls = await buildAllUrls();
  } else if (Array.isArray(body.urls)) {
    urls = body.urls.filter((u: unknown) => typeof u === 'string');
  } else {
    return NextResponse.json({ error: 'Provide { urls: string[] } or { all: true }' }, { status: 400 });
  }

  // Я.IndexNow рекомендует не более 10 000 URL за запрос. У нас обычно ≤ 500.
  const result = await pingIndexNow(urls);

  return NextResponse.json({
    submitted: urls.length,
    ...result,
  });
}
