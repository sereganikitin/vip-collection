import type { Metadata } from 'next';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import PageContentRenderer from '@/components/PageContentRenderer';
import { SITE_URL, SITE_NAME, buildBreadcrumbList, buildFaqJsonLd } from '@/lib/seo';
import { getPageContent } from '@/lib/page-content';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Доставка по Москве и по всей России',
  description:
    'Доставка чемоданов, сумок и кожгалантереи по Москве курьером (от 100 ₽), бесплатно от 20 000 ₽ в пределах МКАД. Я.Доставка во все города России. Оплата картой онлайн или при получении.',
  keywords: [
    'доставка чемоданов москва', 'доставка сумок москва', 'курьер чемодан',
    'Я.Доставка чемоданы', 'оплата при получении',
    'бесплатная доставка чемоданов', 'доставка чемоданов по России', 'доставка подмосковье',
  ],
  alternates: { canonical: `${SITE_URL}/delivery` },
  openGraph: {
    title: 'Доставка по Москве и Подмосковью — VIP COLLECTION',
    description: 'Доставка по Москве от 100 ₽, бесплатно от 20 000 ₽. Я.Доставка по всей России.',
    url: `${SITE_URL}/delivery`,
    type: 'website',
    locale: 'ru_RU',
    siteName: SITE_NAME,
  },
};

export default async function DeliveryPage() {
  const content = await getPageContent('delivery');

  const breadcrumbJsonLd = buildBreadcrumbList([
    { name: 'Главная', url: SITE_URL },
    { name: 'Доставка', url: `${SITE_URL}/delivery` },
  ]);

  const faqJsonLd = content.faq.length > 0 ? buildFaqJsonLd(content.faq) : null;

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${SITE_URL}/delivery#webpage`,
    url: `${SITE_URL}/delivery`,
    name: 'Доставка по Москве и Подмосковью — VIP COLLECTION',
    inLanguage: 'ru-RU',
    isPartOf: { '@id': `${SITE_URL}/#website` },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1'],
    },
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={webPageJsonLd} />
      {faqJsonLd && <JsonLd data={faqJsonLd} />}

      <div className="mx-auto max-w-4xl px-4 py-6">
        <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
          <Link href="/" className="hover:text-accent transition-colors">Главная</Link>
          <ChevronRight size={14} />
          <span className="text-text font-medium">Доставка</span>
        </nav>

        <PageContentRenderer content={content} />
      </div>
    </>
  );
}
