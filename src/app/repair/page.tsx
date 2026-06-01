import type { Metadata } from 'next';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import PageContentRenderer from '@/components/PageContentRenderer';
import {
  SITE_URL, SITE_NAME, buildBreadcrumbList, buildFaqJsonLd, REPAIR_SERVICE_JSONLD,
} from '@/lib/seo';
import { getPageContent } from '@/lib/page-content';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Ремонт чемоданов в Москве — замена колёс, ручек, замков от 200 ₽',
  description:
    'Ремонт чемоданов любых брендов в собственном сервисном центре на Сормовском проезде 11 в Москве. Замена колёс, телескопических ручек, кодовых и TSA-замков, бегунков и молний. Гарантийный ремонт VIP COLLECTION и ARISTOCRAT — бесплатно. Послегарантийный — от 200 ₽ за деталь.',
  keywords: [
    'ремонт чемоданов', 'ремонт чемодана Москва', 'ремонт чемоданов в Москве',
    'починить чемодан', 'починить чемодан Москва', 'мастерская чемоданов',
    'мастерская чемоданов Москва', 'сервис чемоданов', 'сервисный центр чемоданов',
    'замена колеса чемодана', 'замена колёс чемодана',
    'замена ручки чемодана', 'замена телескопической ручки',
    'замена замка чемодана', 'кодовый замок чемодан замена', 'ремонт TSA замка',
    'ремонт VIP COLLECTION', 'ремонт ARISTOCRAT',
    'гарантийный ремонт чемодана', 'послегарантийный ремонт чемодана',
  ],
  alternates: { canonical: `${SITE_URL}/repair` },
  openGraph: {
    title: 'Ремонт чемоданов в Москве — VIP COLLECTION',
    description: 'Замена колёс, ручек, замков. Сервисный центр на Сормовском проезде, 11. Гарантийный ремонт бесплатно.',
    url: `${SITE_URL}/repair`,
    type: 'website',
    locale: 'ru_RU',
    siteName: SITE_NAME,
  },
};

export default async function RepairPage() {
  const content = await getPageContent('repair');

  const breadcrumbJsonLd = buildBreadcrumbList([
    { name: 'Главная', url: SITE_URL },
    { name: 'Ремонт', url: `${SITE_URL}/repair` },
  ]);

  const faqJsonLd = content.faq.length > 0 ? buildFaqJsonLd(content.faq) : null;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={REPAIR_SERVICE_JSONLD} />
      {faqJsonLd && <JsonLd data={faqJsonLd} />}

      <div className="mx-auto max-w-4xl px-4 py-6">
        <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
          <Link href="/" className="hover:text-accent transition-colors">Главная</Link>
          <ChevronRight size={14} />
          <span className="text-text font-medium">Ремонт</span>
        </nav>

        <PageContentRenderer content={content} />
      </div>
    </>
  );
}
