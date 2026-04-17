import type { Metadata } from 'next';
import { products } from '@/data/products';
import { categories } from '@/data/categories';
import ProductDetails from './ProductDetails';

const BASE_URL = 'https://infoseledka.ru';

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);

  if (!product) {
    return { title: 'Товар не найден' };
  }

  const category = categories.find((c) => c.id === product.categoryId);
  const title = `${product.name} — купить в Москве`;
  const description = product.description
    ? `${product.description} Цена ${product.price} ₽. Доставка по Москве и России.`
    : `${product.name}. Цена ${product.price} ₽. Бренд ${product.brand}. Доставка по Москве и России.`;
  const url = `${BASE_URL}/product/${product.slug}`;
  const image = product.images[0] ? `${BASE_URL}${product.images[0]}` : undefined;

  return {
    title,
    description,
    keywords: [product.name, product.brand, category?.name, 'купить', 'Москва'].filter(Boolean) as string[],
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      images: image ? [{ url: image, width: 800, height: 800, alt: product.name }] : [],
      locale: 'ru_RU',
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);

  // JSON-LD Product schema for Yandex/Google rich results
  const jsonLd = product ? {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    sku: product.id,
    brand: { '@type': 'Brand', name: product.brand },
    image: product.images.map((img) => `${BASE_URL}${img}`),
    offers: {
      '@type': 'Offer',
      url: `${BASE_URL}/product/${product.slug}`,
      priceCurrency: 'RUB',
      price: product.price,
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: 'VIP COLLECTION' },
    },
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ProductDetails slug={slug} />
    </>
  );
}
