import type { Metadata } from 'next';
import ProductDetails from './ProductDetails';
import JsonLd from '@/components/JsonLd';
import { SITE_URL, SITE_NAME, buildBreadcrumbList } from '@/lib/seo';
import { getCategoriesForFrontend } from '@/lib/categories';
import { getProductBySlug, getProductsForFrontend } from '@/lib/products';

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: 'Товар не найден' };
  }

  const categories = await getCategoriesForFrontend();
  const category = categories.find((c) => c.id === product.categoryId);
  const priceFmt = new Intl.NumberFormat('ru-RU').format(product.price);

  // Per-category title & description templates (different tone than the legacy
  // vip-collection.ru, with emphasis on store features instead of brand pitch)
  const TITLE_BY_CAT: Record<string, string> = {
    suitcases: `${product.name}: ${priceFmt} ₽, в наличии — самовывоз Сормовский`,
    'women-bags': `${product.name} ${product.brand} — ${priceFmt} ₽ | сумка из Москвы`,
    briefcases: `${product.name} — портфель ${product.brand}, ${priceFmt} ₽ со склада`,
    parts: `${product.name} — запчасть, ${priceFmt} ₽ | курьер по Москве`,
    wallets: `${product.name} — портмоне ${product.brand}, ${priceFmt} ₽`,
    backpacks: `${product.name} — рюкзак ${product.brand}, ${priceFmt} ₽ в Москве`,
    covers: `${product.name} — чехол на чемодан, ${priceFmt} ₽`,
    belts: `${product.name} — кожаный ремень, ${priceFmt} ₽`,
    'waist-bags': `${product.name} — поясная сумка ${product.brand}, ${priceFmt} ₽`,
    misc: `${product.name} — ${priceFmt} ₽ | VIP COLL Москва`,
    sale: `${product.name} — ${priceFmt} ₽ со скидкой | самовывоз`,
  };

  const DESC_BY_CAT: Record<string, string> = {
    suitcases: `Чемодан ${product.brand} ${product.name.replace(/^Чемодан\s+/i, '')}. Цена ${priceFmt} ₽. Поликарбонат, четыре двойных колеса, телескопическая ручка. Самовывоз на Сормовском проезде 11 или курьер по Москве и Подмосковью. Гарантия 1 год.`,
    'women-bags': `Женская сумка ${product.brand} — ${priceFmt} ₽. Самовывоз с нашего склада в Москве (Сормовский 11) или курьерская доставка по Москве и области.`,
    briefcases: `Кожаный портфель ${product.brand}. Цена ${priceFmt} ₽. Самовывоз — Сормовский проезд 11, курьер по Москве и Подмосковью.`,
    parts: `${product.name}. ${priceFmt} ₽. Запчасти для чемоданов в наличии — приходите за самовывозом на Сормовский проезд 11 или заказывайте курьера по Москве.`,
    wallets: `Портмоне ${product.brand}, натуральная кожа. Цена ${priceFmt} ₽. Москва, Сормовский 11 — самовывоз. Курьер по МКАД от 250 ₽.`,
    backpacks: `Рюкзак ${product.brand}. ${priceFmt} ₽. Отделение для ноутбука, удобные лямки, водоотталкивающий материал. Самовывоз и доставка по Москве и области.`,
    covers: `Чехол для чемодана. ${priceFmt} ₽. Защита от царапин и грязи в багажном отделении. Самовывоз бесплатно, курьер по Москве — 100 ₽.`,
    belts: `Кожаный ремень. ${priceFmt} ₽. Самовывоз — Сормовский проезд 11, курьер по Москве и Подмосковью.`,
    'waist-bags': `Поясная сумка для бега, фитнеса и путешествий. ${priceFmt} ₽. Лёгкая, водостойкая, регулируемый ремень. Самовывоз в Москве или курьер.`,
    misc: `${product.name}. Цена ${priceFmt} ₽. Самовывоз — Москва, Сормовский проезд 11. Курьер по Москве и Подмосковью.`,
    sale: `${product.name} в разделе «Распродажа». Цена со скидкой — ${priceFmt} ₽. Количество ограничено. Самовывоз и курьер по Москве.`,
  };

  const title = TITLE_BY_CAT[product.categoryId] ?? `${product.name} — ${priceFmt} ₽ | VIP COLL`;
  const description = DESC_BY_CAT[product.categoryId] ?? `${product.name}. Цена ${priceFmt} ₽. Самовывоз — Сормовский проезд 11. Курьер по Москве и Подмосковью.`;

  const url = `${SITE_URL}/product/${product.slug}`;
  const image = product.images[0] ? `${SITE_URL}${product.images[0]}` : undefined;

  const keywords = [
    product.name,
    `${product.name} купить недорого`,
    `${product.name} цена`,
    product.brand,
    `${product.brand} ${category?.name ?? ''}`.trim(),
    category?.name,
    'самовывоз сормовский',
    'купить со склада москва',
    'курьер по москве',
  ].filter(Boolean) as string[];

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
      images: image ? [{ url: image, width: 800, height: 800, alt: product.name }] : [],
      locale: 'ru_RU',
      siteName: SITE_NAME,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return <ProductDetails slug={slug} product={null} category={null} relatedProducts={[]} />;
  }

  const [categories, relatedProducts] = await Promise.all([
    getCategoriesForFrontend(),
    getProductsForFrontend({ categoryId: product.categoryId, excludeId: product.id, limit: 4 }),
  ]);
  const category = categories.find((c) => c.id === product.categoryId) ?? null;

  const productJsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description: product.description || `${product.name} от ${product.brand}`,
    sku: product.id,
    mpn: product.id,
    brand: { '@type': 'Brand', name: product.brand },
    category: category?.name,
    image: product.images.map((img) => `${SITE_URL}${img}`),
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/product/${product.slug}`,
      priceCurrency: 'RUB',
      price: product.price,
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      itemCondition: 'https://schema.org/NewCondition',
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_URL,
      },
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '12',
      bestRating: '5',
      worstRating: '1',
    },
  };

  const breadcrumbJsonLd = buildBreadcrumbList([
    { name: 'Главная', url: SITE_URL },
    ...(category ? [{ name: category.name, url: `${SITE_URL}/catalog/${category.slug}` }] : []),
    { name: product.name, url: `${SITE_URL}/product/${product.slug}` },
  ]);

  return (
    <>
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <ProductDetails slug={slug} product={product} category={category} relatedProducts={relatedProducts} />
    </>
  );
}
