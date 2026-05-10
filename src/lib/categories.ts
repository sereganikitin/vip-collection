import { prisma } from '@/lib/prisma';
import { categories as staticCategories } from '@/data/categories';

export interface CategoryView {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  productCount: number;
}

export async function getCategoriesForFrontend(): Promise<CategoryView[]> {
  try {
    const cats = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { products: { where: { isActive: true } } } },
      },
    });
    return cats.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      image: c.image,
      productCount: c._count.products,
    }));
  } catch (e) {
    console.error('getCategoriesForFrontend: DB error, falling back to static', e);
    return staticCategories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      image: c.image,
      productCount: c.productCount,
    }));
  }
}
