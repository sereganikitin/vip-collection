import { prisma } from '@/lib/prisma';
import { products as staticProducts } from '@/data/products';
import type { Prisma } from '@prisma/client';

export interface ProductView {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice?: number;
  images: string[];
  description: string;
  specs: Record<string, string>;
  categoryId: string;
  brand: string;
  inStock: boolean;
  isNew?: boolean;
  isSale?: boolean;
}

interface ListOpts {
  categoryId?: string;
  isNew?: boolean;
  isSale?: boolean;
  excludeId?: string;
  limit?: number;
}

function fromStatic(p: (typeof staticProducts)[number]): ProductView {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    oldPrice: p.oldPrice,
    images: p.images,
    description: p.description,
    specs: p.specs,
    categoryId: p.categoryId,
    brand: p.brand,
    inStock: p.inStock,
    isNew: p.isNew,
    isSale: p.isSale,
  };
}

export async function getProductsForFrontend(opts: ListOpts = {}): Promise<ProductView[]> {
  try {
    const where: Prisma.ProductWhereInput = { isActive: true };
    if (opts.categoryId) where.categoryId = opts.categoryId;
    if (opts.isNew) where.isNew = true;
    if (opts.isSale) where.isSale = true;
    if (opts.excludeId) where.id = { not: opts.excludeId };

    const prods = await prisma.product.findMany({
      where,
      include: { brand: true },
      orderBy: { createdAt: 'desc' },
      ...(opts.limit ? { take: opts.limit } : {}),
    });

    return prods.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      oldPrice: p.oldPrice ?? undefined,
      images: p.images,
      description: p.description,
      specs: (p.specs as Record<string, string>) ?? {},
      categoryId: p.categoryId,
      brand: p.brand.name,
      inStock: p.inStock,
      isNew: p.isNew,
      isSale: p.isSale,
    }));
  } catch (e) {
    console.error('getProductsForFrontend: DB error, falling back to static', e);
    let result = staticProducts;
    if (opts.categoryId) result = result.filter((p) => p.categoryId === opts.categoryId);
    if (opts.isNew) result = result.filter((p) => p.isNew);
    if (opts.isSale) result = result.filter((p) => p.isSale);
    if (opts.excludeId) result = result.filter((p) => p.id !== opts.excludeId);
    if (opts.limit) result = result.slice(0, opts.limit);
    return result.map(fromStatic);
  }
}

export async function getProductBySlug(slug: string): Promise<ProductView | null> {
  try {
    const p = await prisma.product.findUnique({
      where: { slug },
      include: { brand: true },
    });
    if (!p || !p.isActive) return null;
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      oldPrice: p.oldPrice ?? undefined,
      images: p.images,
      description: p.description,
      specs: (p.specs as Record<string, string>) ?? {},
      categoryId: p.categoryId,
      brand: p.brand.name,
      inStock: p.inStock,
      isNew: p.isNew,
      isSale: p.isSale,
    };
  } catch (e) {
    console.error('getProductBySlug: DB error, falling back to static', e);
    const p = staticProducts.find((x) => x.slug === slug);
    return p ? fromStatic(p) : null;
  }
}
