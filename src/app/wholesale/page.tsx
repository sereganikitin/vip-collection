import type { Metadata } from 'next';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import PageContentRenderer from '@/components/PageContentRenderer';
import WholesaleForm from '@/components/WholesaleForm';
import { SITE_URL, buildBreadcrumbList, buildFaqJsonLd } from '@/lib/seo';
import { getPageContent } from '@/lib/page-content';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Чемоданы и сумки оптом — VIP COLLECTION для бизнеса',
  description:
    'Оптовая продажа чемоданов, сумок и кожгалантереи для торговых компаний, ИП, интернет-магазинов и тревел-агентств. Гибкие условия, индивидуальные цены, отгрузка со склада в Москве. Регистрация в личном кабинете.',
  keywords: [
    'чемоданы оптом', 'сумки оптом', 'кожгалантерея оптом',
    'оптовый поставщик чемоданов', 'дистрибуция VIP COLLECTION',
    'опт Москва', 'B2B чемоданы', 'оптовая продажа сумок',
  ],
  alternates: { canonical: 'https://vipcoll.ru/wholesale' },
  openGraph: {
    title: 'Чемоданы и сумки оптом — VIP COLLECTION',
    description: 'Опт для торговых компаний, ИП и интернет-магазинов. Индивидуальные цены, отгрузка со склада в Москве.',
    url: 'https://vipcoll.ru/wholesale',
    type: 'website',
    locale: 'ru_RU',
  },
};

const wholesaleServiceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  '@id': `${SITE_URL}/wholesale#service`,
  name: 'Оптовые поставки чемоданов, сумок и кожгалантереи',
  description:
    'Оптовые поставки для торговых компаний, ИП, интернет-магазинов, тревел-блогеров и клубов совместных закупок. Индивидуальные цены, оригинальный товар, отгрузка со склада в Москве.',
  serviceType: 'B2B оптовые поставки',
  provider: { '@id': `${SITE_URL}/#organization` },
  areaServed: { '@type': 'Country', name: 'Россия' },
  audience: {
    '@type': 'BusinessAudience',
    audienceType: 'Торговые компании, ИП, интернет-магазины, тревел-блогеры',
  },
};

export default async function WholesalePage() {
  const content = await getPageContent('wholesale');

  const breadcrumbJsonLd = buildBreadcrumbList([
    { name: 'Главная', url: SITE_URL },
    { name: 'Оптовикам', url: `${SITE_URL}/wholesale` },
  ]);

  const faqJsonLd = content.faq.length > 0 ? buildFaqJsonLd(content.faq) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={wholesaleServiceJsonLd} />
      {faqJsonLd && <JsonLd data={faqJsonLd} />}

      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link href="/" className="hover:text-accent transition-colors">Главная</Link>
        <ChevronRight size={14} />
        <span className="text-text font-medium">Оптовикам</span>
      </nav>

      <PageContentRenderer content={content} />

      <div className="mt-10">
        <WholesaleForm />
      </div>
    </div>
  );
}
