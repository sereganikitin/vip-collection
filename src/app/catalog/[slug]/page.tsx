import type { Metadata } from 'next';
import { categories } from '@/data/categories';
import { products } from '@/data/products';
import CatalogContent from './CatalogContent';
import JsonLd from '@/components/JsonLd';
import { SITE_URL, SITE_NAME, buildBreadcrumbList, buildItemList } from '@/lib/seo';

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const category = categories.find((c) => c.slug === slug);

  if (!category) {
    return { title: 'Каталог' };
  }

  const items = products.filter((p) => p.categoryId === category.id);
  const count = items.length;
  const minPrice = items.length > 0 ? Math.min(...items.map((p) => p.price)) : 0;

  const title = `${category.name} — купить в Москве${minPrice > 0 ? `, от ${minPrice} ₽` : ''}`;
  const description = `${category.name} в интернет-магазине ${SITE_NAME}: ${count} моделей${minPrice > 0 ? ` от ${minPrice} ₽` : ''}. Собственные бренды и проверенные производители. Доставка по Москве и России, оплата при получении, гарантия качества.`;
  const url = `${SITE_URL}/catalog/${category.slug}`;

  const keywords = [
    category.name,
    `${category.name} купить`,
    `${category.name} Москва`,
    `${category.name} интернет-магазин`,
    'VIP COLLECTION',
    'ARISTOCRAT',
    'David Jones',
  ];

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      locale: 'ru_RU',
      siteName: SITE_NAME,
      images: category.image ? [{ url: `${SITE_URL}${category.image}` }] : [],
    },
  };
}

export default async function CatalogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = categories.find((c) => c.slug === slug);
  const items = category
    ? products.filter((p) => p.categoryId === category.id)
    : [];

  const breadcrumbJsonLd = buildBreadcrumbList([
    { name: 'Главная', url: SITE_URL },
    ...(category ? [{ name: category.name, url: `${SITE_URL}/catalog/${category.slug}` }] : []),
  ]);

  const itemListJsonLd = category && items.length > 0
    ? buildItemList(
        items.slice(0, 24).map((p) => ({
          name: p.name,
          slug: p.slug,
          price: p.price,
          image: p.images[0],
          brand: p.brand,
        })),
        category.name
      )
    : null;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      {itemListJsonLd && <JsonLd data={itemListJsonLd} />}
      <CatalogContent slug={slug} />
    </>
  );
}
