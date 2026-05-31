import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, BookOpen, Clock } from 'lucide-react';
import JsonLd from '@/components/JsonLd';
import { SITE_URL, SITE_NAME, buildBreadcrumbList } from '@/lib/seo';
import { guides } from '@/data/guides';

export const metadata: Metadata = {
  title: 'Блог о чемоданах и путешествиях — экспертные гайды VIP COLLECTION',
  description:
    'Экспертные статьи о чемоданах, путешествиях и кожгалантерее: как выбрать чемодан, нормы ручной клади, что такое TSA замок, уход за кожей, ремонт своими руками.',
  keywords: [
    'блог о путешествиях', 'как выбрать чемодан', 'советы путешественнику',
    'статьи о чемоданах', 'гайд по чемоданам', 'нормы ручной клади',
    'TSA замок объяснение', 'уход за кожей',
  ],
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    title: 'Блог о чемоданах и путешествиях',
    description: 'Экспертные гайды по выбору, использованию и ремонту чемоданов.',
    url: `${SITE_URL}/blog`,
    type: 'website',
    locale: 'ru_RU',
    siteName: SITE_NAME,
  },
};

export default function BlogIndexPage() {
  const breadcrumbJsonLd = buildBreadcrumbList([
    { name: 'Главная', url: SITE_URL },
    { name: 'Блог', url: `${SITE_URL}/blog` },
  ]);

  const items = Object.values(guides);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
          <Link href="/" className="hover:text-accent transition-colors">Главная</Link>
          <ChevronRight size={14} />
          <span className="text-text font-medium">Блог</span>
        </nav>

        <header className="mb-10">
          <p className="text-xs sm:text-sm text-accent font-semibold uppercase tracking-wide mb-2">
            VIP COLLECTION
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Блог о чемоданах и путешествиях</h1>
          <p className="text-text-muted text-base md:text-lg">
            Экспертные гайды по выбору, использованию и ремонту чемоданов и кожгалантереи.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-5">
          {items.map((guide) => (
            <Link
              key={guide.slug}
              href={`/blog/${guide.slug}`}
              className="block bg-surface rounded-xl border border-border p-6 hover:shadow-lg hover:border-accent transition-all group"
            >
              <div className="flex items-center gap-2 text-xs text-text-muted mb-3">
                <BookOpen size={14} />
                <span>Гайд</span>
                <span>·</span>
                <Clock size={14} />
                <span>{guide.readMinutes} мин чтения</span>
              </div>
              <h2 className="text-lg font-bold mb-2 group-hover:text-accent transition-colors">
                {guide.h1}
              </h2>
              <p className="text-sm text-text-muted leading-relaxed">{guide.tagline}</p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
