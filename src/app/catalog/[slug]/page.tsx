import type { Metadata } from 'next';
import { categories } from '@/data/categories';
import { products } from '@/data/products';
import CatalogContent from './CatalogContent';

const BASE_URL = 'https://infoseledka.ru';

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const category = categories.find((c) => c.slug === slug);

  if (!category) {
    return { title: 'Каталог' };
  }

  const count = products.filter((p) => p.categoryId === category.id).length;
  const title = `${category.name} — купить в Москве`;
  const description = `${category.name} в интернет-магазине VIP COLLECTION. ${count} товаров. Собственные бренды, известные производители. Доставка по Москве и России.`;
  const url = `${BASE_URL}/catalog/${category.slug}`;

  return {
    title,
    description,
    keywords: [category.name, 'купить', 'Москва', 'VIP COLLECTION', 'каталог'],
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      locale: 'ru_RU',
      images: category.image ? [{ url: `${BASE_URL}${category.image}` }] : [],
    },
  };
}

export default async function CatalogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CatalogContent slug={slug} />;
}
