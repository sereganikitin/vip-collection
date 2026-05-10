import { prisma } from '@/lib/prisma';
import { brands as staticBrands } from '@/data/brands';

export interface BrandView {
  id: string;
  name: string;
  logo: string | null;
}

export async function getBrandsForFrontend(): Promise<BrandView[]> {
  try {
    const brands = await prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return brands.map((b) => ({ id: b.id, name: b.name, logo: b.logo }));
  } catch (e) {
    console.error('getBrandsForFrontend: DB error, falling back to static', e);
    return staticBrands.map((b) => ({ id: b.id, name: b.name, logo: b.logo }));
  }
}
