import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ProductCard from '@/components/ProductCard';
import JsonLd from '@/components/JsonLd';
import {
  SITE_URL,
  SITE_NAME,
  buildBreadcrumbList,
  buildFaqJsonLd,
  buildItemList,
} from '@/lib/seo';
import { brandContent, BRAND_SLUGS } from '@/data/brand-content';
import { getCategoriesForFrontend } from '@/lib/categories';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export function generateStaticParams() {
  return BRAND_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const seo = brandContent[slug];
  if (!seo) return { title: 'Бренд не найден' };

  const url = `${SITE_URL}/brand/${seo.slug}`;
  return {
    title: seo.metaTitle,
    description: seo.metaDescription,
    keywords: seo.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title: seo.metaTitle,
      description: seo.metaDescription,
      locale: 'ru_RU',
      siteName: SITE_NAME,
    },
  };
}

export default async function BrandHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const seo = brandContent[slug];
  if (!seo) notFound();

  // Достаём товары этого бренда из БД (join по brand.name)
  let products: Array<{
    id: string;
    name: string;
    slug: string;
    price: number;
    oldPrice?: number;
    images: string[];
    categoryId: string;
    brand: string;
    description: string;
    specs: Record<string, string>;
    inStock: boolean;
    isNew?: boolean;
    isSale?: boolean;
  }> = [];

  try {
    const prods = await prisma.product.findMany({
      where: {
        isActive: true,
        brand: { name: seo.brandName },
      },
      include: { brand: true },
      orderBy: [{ isNew: 'desc' }, { createdAt: 'desc' }],
    });
    products = prods.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      oldPrice: p.oldPrice ?? undefined,
      images: p.images,
      categoryId: p.categoryId,
      brand: p.brand.name,
      description: p.description,
      specs: (p.specs as Record<string, string>) ?? {},
      inStock: p.inStock,
      isNew: p.isNew,
      isSale: p.isSale,
    }));
  } catch (e) {
    console.error('BrandHubPage: DB error', e);
  }

  const categories = await getCategoriesForFrontend();
  const primaryCategories = seo.primaryCategories
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const minPrice = products.length > 0 ? Math.min(...products.map((p) => p.price)) : 0;
  const url = `${SITE_URL}/brand/${seo.slug}`;

  // JSON-LD
  const breadcrumbJsonLd = buildBreadcrumbList([
    { name: 'Главная', url: SITE_URL },
    { name: seo.brandName, url },
  ]);

  const brandJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Brand',
    '@id': `${url}#brand`,
    name: seo.brandName,
    description: seo.metaDescription,
    url,
    logo: `${SITE_URL}${seo.logo}`,
  };

  const itemListJsonLd =
    products.length > 0
      ? buildItemList(
          products.slice(0, 30).map((p) => ({
            name: p.name,
            slug: p.slug,
            price: p.price,
            image: p.images[0],
            brand: p.brand,
          })),
          `${seo.brandName} — каталог в VIP COLLECTION`
        )
      : null;

  const faqJsonLd = seo.faq && seo.faq.length > 0 ? buildFaqJsonLd(seo.faq) : null;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={brandJsonLd} />
      {itemListJsonLd && <JsonLd data={itemListJsonLd} />}
      {faqJsonLd && <JsonLd data={faqJsonLd} />}

      <div className="mx-auto max-w-7xl px-4 py-6">
        <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
          <Link href="/" className="hover:text-accent transition-colors">Главная</Link>
          <ChevronRight size={14} />
          <span className="text-text font-medium">{seo.brandName}</span>
        </nav>

        {/* Hero */}
        <section className="bg-surface rounded-2xl border border-border p-6 md:p-10 mb-10">
          <div className="grid md:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <p className="text-xs sm:text-sm text-accent font-semibold uppercase tracking-wide mb-2">
                Бренд в VIP COLLECTION
              </p>
              <h1 className="text-2xl md:text-4xl font-bold mb-3">{seo.h1}</h1>
              <p className="text-text-muted text-base md:text-lg mb-4">{seo.tagline}</p>
              {minPrice > 0 && (
                <p className="text-sm text-text-muted">
                  <span className="font-medium text-text">{products.length} товаров</span>
                  {' '}в каталоге, от{' '}
                  <span className="font-medium text-text">
                    {new Intl.NumberFormat('ru-RU').format(minPrice)} ₽
                  </span>
                </p>
              )}
            </div>
            <div className="w-32 h-32 sm:w-40 sm:h-40 bg-white border border-border rounded-2xl relative flex-shrink-0">
              <Image
                src={seo.logo}
                alt={`Логотип ${seo.brandName}`}
                fill
                className="object-contain p-4"
                sizes="160px"
              />
            </div>
          </div>
        </section>

        {/* Intro */}
        <article className="prose prose-sm max-w-none mb-10">
          <p className="text-text-muted leading-relaxed">{seo.intro}</p>
        </article>

        {/* Категории бренда — внутренние ссылки */}
        {primaryCategories.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl md:text-2xl font-bold mb-4">
              Категории {seo.brandName}
            </h2>
            <div className="flex flex-wrap gap-2">
              {primaryCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/catalog/${cat.slug}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface border border-border rounded-lg hover:border-accent hover:text-accent transition-colors text-sm"
                >
                  {cat.name}
                  <ArrowRight size={14} />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Сетка товаров */}
        {products.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl md:text-2xl font-bold mb-6">
              Товары {seo.brandName} в наличии
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.slice(0, 24).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* SEO-секции */}
        {seo.sections.length > 0 && (
          <section className="grid md:grid-cols-2 gap-6 mb-10">
            {seo.sections.map((section) => (
              <article
                key={section.title}
                className="bg-surface rounded-xl border border-border p-5"
              >
                <h2 className="text-lg font-semibold mb-2">{section.title}</h2>
                <p className="text-sm text-text-muted leading-relaxed">{section.body}</p>
              </article>
            ))}
          </section>
        )}

        {/* FAQ */}
        {seo.faq && seo.faq.length > 0 && (
          <section className="bg-surface rounded-xl border border-border p-6 md:p-8 mb-10">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Частые вопросы о {seo.brandName}</h2>
            <div className="divide-y divide-border">
              {seo.faq.map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="flex justify-between items-start cursor-pointer text-base font-medium hover:text-accent transition-colors">
                    <span>{item.q}</span>
                    <ChevronRight size={18} className="flex-shrink-0 ml-3 mt-0.5 transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-3 text-sm text-text-muted leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
