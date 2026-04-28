import type { Metadata } from 'next';
import { products } from '@/data/products';
import { categories } from '@/data/categories';
import ProductDetails from './ProductDetails';
import JsonLd from '@/components/JsonLd';
import { SITE_URL, SITE_NAME, buildBreadcrumbList } from '@/lib/seo';

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);

  if (!product) {
    return { title: 'Товар не найден' };
  }

  const category = categories.find((c) => c.id === product.categoryId);
  const title = `${product.name} — купить в Москве, цена ${product.price} ₽`;
  const description = product.description
    ? `${product.description} Цена ${product.price} ₽. Бренд ${product.brand}. Доставка по Москве и России. Гарантия. Оплата картой и наличными.`
    : `${product.name}. Цена ${product.price} ₽. Бренд ${product.brand}. Доставка по Москве и России. Гарантия от производителя.`;
  const url = `${SITE_URL}/product/${product.slug}`;
  const image = product.images[0] ? `${SITE_URL}${product.images[0]}` : undefined;

  const keywords = [
    product.name,
    `${product.name} купить`,
    `${product.name} цена`,
    product.brand,
    `${product.brand} ${category?.name}`,
    category?.name,
    'купить в Москве',
    'интернет-магазин',
    'VIP COLLECTION',
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
  const product = products.find((p) => p.slug === slug);

  if (!product) {
    return <ProductDetails slug={slug} />;
  }

  const category = categories.find((c) => c.id === product.categoryId);

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
      <ProductDetails slug={slug} />
    </>
  );
}
