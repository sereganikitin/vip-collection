import type { Metadata } from 'next';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import PageContentRenderer from '@/components/PageContentRenderer';
import { SITE_URL, buildBreadcrumbList, buildFaqJsonLd } from '@/lib/seo';
import { getPageContent } from '@/lib/page-content';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'О компании VIP COLLECTION — итальянские традиции качества',
  description:
    'VIP COLLECTION — российский интернет-магазин чемоданов и кожгалантереи. Собственные бренды VIP COLLECTION и ARISTOCRAT. Корни в Италии, производство в Тоскане. Курьер по Москве и Я.Доставка по всей России.',
  keywords: ['о компании VIP COLLECTION', 'итальянские чемоданы', 'ARISTOCRAT', 'история бренда', 'тосканская кожа'],
  alternates: { canonical: 'https://vipcoll.ru/about' },
  openGraph: {
    title: 'О компании VIP COLLECTION',
    description: 'Собственные бренды VIP COLLECTION и ARISTOCRAT. Итальянские традиции, производство в Тоскане.',
    url: 'https://vipcoll.ru/about',
    type: 'website',
    locale: 'ru_RU',
  },
};

export default async function AboutPage() {
  const content = await getPageContent('about');

  const breadcrumbJsonLd = buildBreadcrumbList([
    { name: 'Главная', url: SITE_URL },
    { name: 'О компании', url: `${SITE_URL}/about` },
  ]);

  const faqJsonLd = content.faq.length > 0 ? buildFaqJsonLd(content.faq) : null;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      {faqJsonLd && <JsonLd data={faqJsonLd} />}

      <div className="mx-auto max-w-4xl px-4 py-6">
        <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
          <Link href="/" className="hover:text-accent transition-colors">Главная</Link>
          <ChevronRight size={14} />
          <span className="text-text font-medium">О компании</span>
        </nav>

        <PageContentRenderer content={content} />
      </div>
    </>
  );
}
