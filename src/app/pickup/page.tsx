import type { Metadata } from 'next';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import PageContentRenderer from '@/components/PageContentRenderer';
import { SITE_URL, buildBreadcrumbList, buildFaqJsonLd } from '@/lib/seo';
import { getPageContent } from '@/lib/page-content';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Где купить чемоданы VIP COLLECTION в Москве — самовывоз',
  description:
    'Магазин-склад VIP COLLECTION в Москве: Сормовский проезд, 11, стр. 1. Самовывоз заказов, осмотр товара, консультация по выбору чемодана. Удобный подъезд, метро Кожуховская / Печатники.',
  keywords: [
    'где купить чемодан', 'магазин чемоданов Москва', 'самовывоз чемоданов',
    'Сормовский проезд 11', 'магазин кожгалантереи', 'офлайн магазин чемоданов',
  ],
  alternates: { canonical: 'https://vipcoll.ru/pickup' },
  openGraph: {
    title: 'Где купить чемоданы — Самовывоз VIP COLLECTION',
    description: 'Магазин-склад на Сормовском проезде, 11. Самовывоз и осмотр товара.',
    url: 'https://vipcoll.ru/pickup',
    type: 'website',
    locale: 'ru_RU',
  },
};

export default async function PickupPage() {
  const content = await getPageContent('pickup');

  const breadcrumbJsonLd = buildBreadcrumbList([
    { name: 'Главная', url: SITE_URL },
    { name: 'Где купить', url: `${SITE_URL}/pickup` },
  ]);

  const faqJsonLd = content.faq.length > 0 ? buildFaqJsonLd(content.faq) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <JsonLd data={breadcrumbJsonLd} />
      {faqJsonLd && <JsonLd data={faqJsonLd} />}

      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link href="/" className="hover:text-accent transition-colors">Главная</Link>
        <ChevronRight size={14} />
        <span className="text-text font-medium">Где купить</span>
      </nav>

      <PageContentRenderer content={content} />
    </div>
  );
}
