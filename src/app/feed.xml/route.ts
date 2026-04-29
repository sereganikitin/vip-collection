import { prisma } from '@/lib/prisma';
import { products as staticProducts } from '@/data/products';
import { categories as staticCategories } from '@/data/categories';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const SITE_URL = 'https://infoseledka.ru';

function xmlEscape(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatYmlDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface FeedCategory {
  id: string;
  name: string;
  parentId?: string | null;
}

interface FeedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice?: number | null;
  description?: string;
  images: string[];
  brand: string;
  categoryId: string;
  inStock: boolean;
  specs?: Record<string, string | number>;
}

async function loadFromDb(): Promise<{ categories: FeedCategory[]; products: FeedProduct[] } | null> {
  try {
    const [cats, prods] = await Promise.all([
      prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.product.findMany({
        where: { isActive: true },
        include: { brand: true },
      }),
    ]);

    if (prods.length === 0) return null;

    return {
      categories: cats.map((c) => ({ id: c.id, name: c.name })),
      products: prods.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        oldPrice: p.oldPrice,
        description: p.description || undefined,
        images: p.images,
        brand: p.brand.name,
        categoryId: p.categoryId,
        inStock: p.inStock,
        specs: (p.specs as Record<string, string | number>) || undefined,
      })),
    };
  } catch (e) {
    console.error('Feed DB error, using static data:', e);
    return null;
  }
}

function loadFromStatic(): { categories: FeedCategory[]; products: FeedProduct[] } {
  return {
    categories: staticCategories.map((c) => ({ id: c.id, name: c.name })),
    products: staticProducts.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      oldPrice: p.oldPrice,
      description: p.description,
      images: p.images,
      brand: p.brand,
      categoryId: p.categoryId,
      inStock: p.inStock,
      specs: p.specs,
    })),
  };
}

export async function GET() {
  const data = (await loadFromDb()) ?? loadFromStatic();
  const { categories, products } = data;

  const categoriesById = new Map(categories.map((c) => [c.id, c]));
  const usedCategoryIds = new Set(products.map((p) => p.categoryId));
  const usedCategories = categories.filter((c) => usedCategoryIds.has(c.id));

  const offers = products
    .filter((p) => categoriesById.has(p.categoryId))
    .map((p) => {
      const url = `${SITE_URL}/product/${p.slug}`;
      const picture = p.images[0]
        ? `${SITE_URL}${p.images[0].startsWith('/') ? '' : '/'}${p.images[0]}`
        : '';

      const description = (p.description || `${p.name}. Бренд: ${p.brand}.`)
        .slice(0, 3000);

      const params = p.specs
        ? Object.entries(p.specs)
            .filter(([, v]) => v != null && v !== '')
            .slice(0, 20)
            .map(
              ([key, value]) =>
                `      <param name="${xmlEscape(key)}">${xmlEscape(String(value))}</param>`
            )
            .join('\n')
        : '';

      const oldPriceTag = p.oldPrice && p.oldPrice > p.price
        ? `      <oldprice>${p.oldPrice}</oldprice>\n`
        : '';

      return `    <offer id="${xmlEscape(p.id)}" available="${p.inStock ? 'true' : 'false'}">
      <url>${xmlEscape(url)}</url>
      <price>${p.price}</price>
${oldPriceTag}      <currencyId>RUR</currencyId>
      <categoryId>${xmlEscape(p.categoryId)}</categoryId>
      <picture>${xmlEscape(picture)}</picture>
      <name>${xmlEscape(p.name)}</name>
      <vendor>${xmlEscape(p.brand)}</vendor>
      <description><![CDATA[${description}]]></description>
${params}
    </offer>`;
    })
    .join('\n');

  const categoriesXml = usedCategories
    .map((c) => `    <category id="${xmlEscape(c.id)}">${xmlEscape(c.name)}</category>`)
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE yml_catalog SYSTEM "shops.dtd">
<yml_catalog date="${formatYmlDate(new Date())}">
  <shop>
    <name>VIP COLLECTION</name>
    <company>VIP COLLECTION</company>
    <url>${SITE_URL}</url>
    <platform>Next.js</platform>
    <currencies>
      <currency id="RUR" rate="1"/>
    </currencies>
    <categories>
${categoriesXml}
    </categories>
    <offers>
${offers}
    </offers>
  </shop>
</yml_catalog>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
