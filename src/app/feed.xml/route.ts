import { prisma } from '@/lib/prisma';
import { products as staticProducts } from '@/data/products';
import { categories as staticCategories } from '@/data/categories';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const SITE_URL = 'https://vipcoll.ru';
const SALES_NOTES = 'Самовывоз: Москва, Сормовский проезд, 11, стр. 1';

// Точка самовывоза для Я.Товаров/Я.Маркета. С блоком <outlets>
// каждый оффер привязывается к конкретному складу — это даёт Я.Товарам
// геоданные «товар доступен в магазине рядом с пользователем» и сильно
// повышает шансы показа в выдаче для жителей Москвы.
const PICKUP_OUTLET_ID = 1;
const PICKUP_OUTLET = {
  id: PICKUP_OUTLET_ID,
  type: 'depot' as const,
  region: 'Москва',
  name: 'Магазин-склад на Сормовском',
  address: '115088, Москва, Сормовский проезд, 11, стр. 1',
  phone: '+7 925 743-71-35',
  workingDays: 'пн-пт 10:00-18:00; сб 11:00-17:00',
};

function xmlEscape(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// FNV-1a 32-bit hash → stable short numeric id from cuid/string
function hashId(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function absUrl(p: string): string {
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  return `${SITE_URL}${p.startsWith('/') ? '' : '/'}${p}`;
}

function formatYmlDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const tz = -d.getTimezoneOffset();
  const tzSign = tz >= 0 ? '+' : '-';
  const tzAbs = Math.abs(tz);
  const tzStr = `${tzSign}${pad(Math.floor(tzAbs / 60))}${pad(tzAbs % 60)}`;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}${tzStr}`;
}

interface FeedCategory {
  id: string;
  name: string;
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
      const offerId = hashId(p.id);
      const categoryId = hashId(p.categoryId);
      const url = `${SITE_URL}/product/${p.slug}`;

      const pictures = (p.images || [])
        .slice(0, 10)
        .map(absUrl)
        .filter(Boolean)
        .map((u) => `      <picture>${xmlEscape(u)}</picture>`)
        .join('\n');

      const description = (p.description || `${p.name}. Бренд: ${p.brand}.`).slice(0, 3000);

      const oldPriceTag = p.oldPrice && p.oldPrice > p.price
        ? `      <oldprice>${p.oldPrice}</oldprice>\n`
        : '';

      const params = p.specs
        ? Object.entries(p.specs)
            .filter(([, v]) => v != null && String(v).trim() !== '')
            .slice(0, 20)
            .map(
              ([key, value]) =>
                `      <param name="${xmlEscape(key)}">${xmlEscape(String(value))}</param>`
            )
            .join('\n')
        : '';

      // Привязываем оффер к складу на Сормовском (точка самовывоза).
      // instock — приблизительный остаток (Я.Товары не требует точного,
      // важен сам факт наличия в данной точке).
      const outletsTag = p.inStock
        ? `      <outlets>\n        <outlet id="${PICKUP_OUTLET_ID}" instock="3"/>\n      </outlets>\n`
        : '';

      return `    <offer id="${offerId}" available="${p.inStock ? 'true' : 'false'}">
      <url>${xmlEscape(url)}</url>
      <price>${p.price}</price>
${oldPriceTag}      <currencyId>RUR</currencyId>
      <categoryId>${categoryId}</categoryId>
${pictures ? pictures + '\n' : ''}      <store>true</store>
      <pickup>true</pickup>
      <delivery>false</delivery>
      <name>${xmlEscape(p.name)}</name>
      <vendor>${xmlEscape(p.brand)}</vendor>
      <vendorCode>${xmlEscape(p.id)}</vendorCode>
      <description><![CDATA[${description}]]></description>
      <sales_notes>${xmlEscape(SALES_NOTES)}</sales_notes>
${outletsTag}${params ? params + '\n' : ''}    </offer>`;
    })
    .join('\n');

  const categoriesXml = usedCategories
    .map((c) => `    <category id="${hashId(c.id)}">${xmlEscape(c.name)}</category>`)
    .join('\n');

  const outletsXml = `    <outlets>
      <outlet id="${PICKUP_OUTLET.id}" type="${PICKUP_OUTLET.type}" region="${xmlEscape(PICKUP_OUTLET.region)}" name="${xmlEscape(PICKUP_OUTLET.name)}">
        <phone>${xmlEscape(PICKUP_OUTLET.phone)}</phone>
        <address>${xmlEscape(PICKUP_OUTLET.address)}</address>
        <working_days>${xmlEscape(PICKUP_OUTLET.workingDays)}</working_days>
      </outlet>
    </outlets>`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="${formatYmlDate(new Date())}">
  <shop>
    <name>VIP COLLECTION</name>
    <company>VIP COLLECTION</company>
    <url>${SITE_URL}</url>
    <currencies>
      <currency id="RUR" rate="1"/>
    </currencies>
    <categories>
${categoriesXml}
    </categories>
${outletsXml}
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
