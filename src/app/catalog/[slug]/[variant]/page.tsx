import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import JsonLd from '@/components/JsonLd';
import {
  SITE_URL,
  SITE_NAME,
  buildBreadcrumbList,
  buildItemList,
  buildFaqJsonLd,
} from '@/lib/seo';
import { getCategoriesForFrontend } from '@/lib/categories';
import { getProductsForFrontend } from '@/lib/products';
import {
  getVariant,
  getAllVariantPairs,
  categoryVariants,
} from '@/data/subcategory-content';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export function generateStaticParams() {
  return getAllVariantPairs().map((pair) => ({
    slug: pair.categorySlug,
    variant: pair.variantSlug,
  }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string; variant: string }> }
): Promise<Metadata> {
  const { slug, variant } = await params;
  const variantSeo = getVariant(slug, variant);
  if (!variantSeo) return { title: 'Страница не найдена' };

  const url = `${SITE_URL}/catalog/${slug}/${variant}`;
  return {
    title: variantSeo.metaTitle,
    description: variantSeo.metaDescription,
    keywords: variantSeo.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title: variantSeo.metaTitle,
      description: variantSeo.metaDescription,
      locale: 'ru_RU',
      siteName: SITE_NAME,
    },
  };
}

export default async function CatalogVariantPage({
  params,
}: {
  params: Promise<{ slug: string; variant: string }>;
}) {
  const { slug, variant } = await params;
  const variantSeo = getVariant(slug, variant);
  if (!variantSeo) notFound();

  const categories = await getCategoriesForFrontend();
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  const allItems = await getProductsForFrontend({ categoryId: category.id });
  const filtered = allItems.filter(variantSeo.filter);

  const url = `${SITE_URL}/catalog/${slug}/${variant}`;
  const categoryUrl = `${SITE_URL}/catalog/${slug}`;

  // JSON-LD
  const breadcrumbJsonLd = buildBreadcrumbList([
    { name: 'Главная', url: SITE_URL },
    { name: category.name, url: categoryUrl },
    { name: variantSeo.h1, url },
  ]);

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: variantSeo.h1,
    description: variantSeo.metaDescription,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    inLanguage: 'ru-RU',
    publisher: { '@id': `${SITE_URL}/#organization` },
    author: { '@id': `${SITE_URL}/#organization` },
    keywords: variantSeo.keywords.slice(0, 30).join(', '),
  };

  const itemListJsonLd =
    filtered.length > 0
      ? buildItemList(
          filtered.slice(0, 24).map((p) => ({
            name: p.name,
            slug: p.slug,
            price: p.price,
            image: p.images[0],
            brand: p.brand,
          })),
          variantSeo.h1
        )
      : null;

  const faqJsonLd = variantSeo.faq && variantSeo.faq.length > 0 ? buildFaqJsonLd(variantSeo.faq) : null;

  // Соседние варианты внутри той же категории — для внутренней перелинковки
  const siblings = (categoryVariants[category.id] ?? []).filter((v) => v.slug !== variant);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={articleJsonLd} />
      {itemListJsonLd && <JsonLd data={itemListJsonLd} />}
      {faqJsonLd && <JsonLd data={faqJsonLd} />}

      <div className="mx-auto max-w-7xl px-4 py-6">
        <nav className="flex items-center gap-2 text-sm text-text-muted mb-6 flex-wrap">
          <Link href="/" className="hover:text-accent transition-colors">Главная</Link>
          <ChevronRight size={14} />
          <Link href={`/catalog/${slug}`} className="hover:text-accent transition-colors">{category.name}</Link>
          <ChevronRight size={14} />
          <span className="text-text font-medium">{variantSeo.h1}</span>
        </nav>

        <header className="mb-8">
          <p className="text-xs sm:text-sm text-accent font-semibold uppercase tracking-wide mb-2">
            {category.name}
          </p>
          <h1 className="text-2xl md:text-4xl font-bold mb-3">{variantSeo.h1}</h1>
          <p className="text-text-muted text-base md:text-lg">{variantSeo.tagline}</p>
        </header>

        {/* Intro */}
        <article className="prose prose-sm max-w-none mb-10">
          <p className="text-text-muted leading-relaxed">{variantSeo.intro}</p>
        </article>

        {/* Сетка товаров */}
        {filtered.length > 0 ? (
          <section className="mb-12">
            <h2 className="text-xl md:text-2xl font-bold mb-6">
              Товары в наличии ({filtered.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.slice(0, 24).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        ) : (
          <section className="bg-surface border border-border rounded-xl p-8 text-center mb-12">
            <h2 className="text-lg font-semibold mb-2">Сейчас этих товаров нет в наличии</h2>
            <p className="text-text-muted text-sm mb-4">
              Загляните в общий каталог или напишите нам — поможем подобрать аналог.
            </p>
            <Link
              href={`/catalog/${slug}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-primary font-semibold rounded-lg hover:bg-accent-hover transition-colors text-sm"
            >
              Перейти в каталог «{category.name}»
            </Link>
          </section>
        )}

        {/* SEO-секции */}
        {variantSeo.sections.length > 0 && (
          <section className="grid md:grid-cols-2 gap-6 mb-10">
            {variantSeo.sections.map((section) => (
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
        {variantSeo.faq && variantSeo.faq.length > 0 && (
          <section className="bg-surface rounded-xl border border-border p-6 md:p-8 mb-10">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Частые вопросы</h2>
            <div className="divide-y divide-border">
              {variantSeo.faq.map((item) => (
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

        {/* Соседние варианты — перелинковка */}
        {siblings.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold mb-4">
              Другие подборки в категории «{category.name}»
            </h2>
            <div className="flex flex-wrap gap-2">
              {siblings.map((v) => (
                <Link
                  key={v.slug}
                  href={`/catalog/${slug}/${v.slug}`}
                  className="px-4 py-2 bg-surface border border-border rounded-lg hover:border-accent hover:text-accent transition-colors text-sm"
                >
                  {v.h1}
                </Link>
              ))}
              <Link
                href={`/catalog/${slug}`}
                className="px-4 py-2 bg-accent/10 border border-accent/30 text-accent font-medium rounded-lg hover:bg-accent/15 transition-colors text-sm"
              >
                Весь каталог →
              </Link>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
