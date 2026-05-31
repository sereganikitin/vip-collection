import type { Metadata } from 'next';
import { categorySeoContent, GLOBAL_KEYWORDS } from '@/data/seo-content';
import CatalogContent from './CatalogContent';
import JsonLd from '@/components/JsonLd';
import { SITE_URL, SITE_NAME, buildBreadcrumbList, buildItemList, buildFaqJsonLd } from '@/lib/seo';
import { getCategoriesForFrontend } from '@/lib/categories';
import { getProductsForFrontend } from '@/lib/products';

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const categories = await getCategoriesForFrontend();
  const category = categories.find((c) => c.slug === slug);

  if (!category) {
    return { title: 'Каталог' };
  }

  const seo = categorySeoContent[slug];
  const items = await getProductsForFrontend({ categoryId: category.id });
  const count = items.length;
  const minPrice = items.length > 0 ? Math.min(...items.map((p) => p.price)) : 0;

  const title = seo?.metaTitle ?? `${category.name} — купить в Москве${minPrice > 0 ? `, от ${minPrice} ₽` : ''}`;
  const description = seo?.metaDescription
    ?? `${category.name} в интернет-магазине ${SITE_NAME}: ${count} моделей${minPrice > 0 ? ` от ${minPrice} ₽` : ''}. Собственные бренды, доставка по Москве и России.`;

  const keywords = [
    ...(seo?.keywords ?? [
      category.name,
      `${category.name} купить`,
      `${category.name} Москва`,
    ]),
    ...GLOBAL_KEYWORDS,
  ];

  const url = `${SITE_URL}/catalog/${category.slug}`;

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
  const categories = await getCategoriesForFrontend();
  const category = categories.find((c) => c.slug === slug);
  const items = category
    ? await getProductsForFrontend({ categoryId: category.id })
    : [];
  const seo = categorySeoContent[slug];

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

  // FAQPage Schema if there are FAQ items for this category
  const faqJsonLd = seo?.faq && seo.faq.length > 0 ? buildFaqJsonLd(seo.faq) : null;

  // CollectionPage Schema — главная сущность страницы каталога
  const collectionPageJsonLd = category
    ? {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': `${SITE_URL}/catalog/${category.slug}#webpage`,
        url: `${SITE_URL}/catalog/${category.slug}`,
        name: seo?.metaTitle ?? category.name,
        description: seo?.metaDescription,
        inLanguage: 'ru-RU',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        about: category.name,
      }
    : null;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      {collectionPageJsonLd && <JsonLd data={collectionPageJsonLd} />}
      {itemListJsonLd && <JsonLd data={itemListJsonLd} />}
      {faqJsonLd && <JsonLd data={faqJsonLd} />}
      <CatalogContent slug={slug} seo={seo} categories={categories} items={items} />
    </>
  );
}
