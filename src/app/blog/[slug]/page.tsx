import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Clock, ArrowRight } from 'lucide-react';
import JsonLd from '@/components/JsonLd';
import {
  SITE_URL,
  SITE_NAME,
  buildBreadcrumbList,
  buildFaqJsonLd,
} from '@/lib/seo';
import { guides, GUIDE_SLUGS } from '@/data/guides';
import { getCategoriesForFrontend } from '@/lib/categories';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return GUIDE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const g = guides[slug];
  if (!g) return { title: 'Гайд не найден' };

  const url = `${SITE_URL}/blog/${g.slug}`;
  return {
    title: g.metaTitle,
    description: g.metaDescription,
    keywords: g.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: g.metaTitle,
      description: g.metaDescription,
      locale: 'ru_RU',
      siteName: SITE_NAME,
      publishedTime: g.publishedAt,
      modifiedTime: g.updatedAt,
    },
  };
}

// Простой markdown-bold → <strong> + сохранение переносов.
// Гайды пишутся в формате: «**bold**» в строках.
function renderParagraph(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const g = guides[slug];
  if (!g) notFound();

  const url = `${SITE_URL}/blog/${g.slug}`;
  const categories = await getCategoriesForFrontend();
  const relatedCats = (g.relatedCategories ?? [])
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
  const relatedGuidesData = (g.relatedGuides ?? [])
    .map((s) => guides[s])
    .filter(Boolean);

  // JSON-LD
  const breadcrumbJsonLd = buildBreadcrumbList([
    { name: 'Главная', url: SITE_URL },
    { name: 'Блог', url: `${SITE_URL}/blog` },
    { name: g.h1, url },
  ]);

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: g.h1,
    description: g.metaDescription,
    datePublished: g.publishedAt,
    dateModified: g.updatedAt,
    inLanguage: 'ru-RU',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    publisher: { '@id': `${SITE_URL}/#organization` },
    author: { '@id': `${SITE_URL}/#organization` },
    keywords: g.keywords.slice(0, 30).join(', '),
    image: `${SITE_URL}/images/banners/banner-1.jpg`,
  };

  const howToJsonLd = g.howto
    ? {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: g.howto.title,
        ...(g.howto.totalTimeMinutes
          ? { totalTime: `PT${g.howto.totalTimeMinutes}M` }
          : {}),
        step: g.howto.steps.map((s, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: s.name,
          text: s.text,
        })),
      }
    : null;

  const faqJsonLd = g.faq && g.faq.length > 0 ? buildFaqJsonLd(g.faq) : null;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={articleJsonLd} />
      {howToJsonLd && <JsonLd data={howToJsonLd} />}
      {faqJsonLd && <JsonLd data={faqJsonLd} />}

      <article className="mx-auto max-w-3xl px-4 py-6">
        <nav className="flex items-center gap-2 text-sm text-text-muted mb-6 flex-wrap">
          <Link href="/" className="hover:text-accent transition-colors">Главная</Link>
          <ChevronRight size={14} />
          <Link href="/blog" className="hover:text-accent transition-colors">Блог</Link>
          <ChevronRight size={14} />
          <span className="text-text font-medium">{g.h1}</span>
        </nav>

        <header className="mb-8">
          <div className="flex items-center gap-3 text-xs text-text-muted mb-3">
            <Clock size={14} />
            <span>{g.readMinutes} мин чтения</span>
            <span>·</span>
            <time dateTime={g.updatedAt}>
              {new Date(g.updatedAt).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </time>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{g.h1}</h1>
          <p className="text-text-muted text-base md:text-lg leading-relaxed">{g.tagline}</p>
        </header>

        <div className="space-y-10">
          {g.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl md:text-2xl font-bold mb-4">{section.heading}</h2>
              <div className="space-y-4 text-text-muted leading-relaxed">
                {section.paragraphs.map((p, i) => (
                  <p key={i}>{renderParagraph(p)}</p>
                ))}
              </div>
            </section>
          ))}

          {g.howto && (
            <section className="bg-surface rounded-xl border border-border p-6">
              <h2 className="text-xl md:text-2xl font-bold mb-4">{g.howto.title}</h2>
              <ol className="space-y-4">
                {g.howto.steps.map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-accent text-primary font-bold rounded-full flex items-center justify-center text-sm">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-semibold mb-1">{step.name}</p>
                      <p className="text-sm text-text-muted">{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {g.faq && g.faq.length > 0 && (
            <section className="bg-surface rounded-xl border border-border p-6">
              <h2 className="text-xl md:text-2xl font-bold mb-4">Частые вопросы</h2>
              <div className="divide-y divide-border">
                {g.faq.map((item) => (
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

        {/* Перелинковка с категориями */}
        {relatedCats.length > 0 && (
          <section className="mt-12 pt-8 border-t border-border">
            <h2 className="text-lg font-bold mb-3">Связанные категории</h2>
            <div className="flex flex-wrap gap-2">
              {relatedCats.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/catalog/${cat.slug}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface border border-border rounded-lg hover:border-accent hover:text-accent transition-colors text-sm"
                >
                  {cat.name} <ArrowRight size={14} />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Связанные гайды */}
        {relatedGuidesData.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-bold mb-3">Читать дальше</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {relatedGuidesData.map((rg) => (
                <Link
                  key={rg.slug}
                  href={`/blog/${rg.slug}`}
                  className="block bg-surface rounded-xl border border-border p-4 hover:shadow-md hover:border-accent transition-all"
                >
                  <p className="text-xs text-text-muted mb-1">Гайд · {rg.readMinutes} мин</p>
                  <p className="font-medium text-sm">{rg.h1}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
