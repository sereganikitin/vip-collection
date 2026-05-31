import type { Metadata } from 'next';
import { ChevronRight, Wrench, Settings, CircleCheck } from 'lucide-react';
import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import {
  SITE_URL,
  SITE_NAME,
  buildBreadcrumbList,
  buildFaqJsonLd,
  REPAIR_SERVICE_JSONLD,
} from '@/lib/seo';
import { REPAIR_FAQ } from '@/data/seo-content';

export const metadata: Metadata = {
  title: 'Ремонт чемоданов в Москве — замена колёс, ручек, замков от 200 ₽',
  description:
    'Ремонт чемоданов любых брендов в собственном сервисном центре на Сормовском проезде 11 в Москве. Замена колёс, телескопических ручек, кодовых и TSA-замков, бегунков и молний. Гарантийный ремонт VIP COLLECTION и ARISTOCRAT — бесплатно. Послегарантийный — от 200 ₽ за деталь.',
  keywords: [
    'ремонт чемоданов', 'ремонт чемодана Москва', 'ремонт чемоданов в Москве',
    'починить чемодан', 'починить чемодан Москва', 'мастерская чемоданов',
    'мастерская чемоданов Москва', 'сервис чемоданов', 'сервисный центр чемоданов',
    'замена колеса чемодана', 'замена колёс чемодана', 'купить колесо чемодан',
    'замена ручки чемодана', 'замена телескопической ручки',
    'замена замка чемодана', 'кодовый замок чемодан замена', 'ремонт TSA замка',
    'замена бегунка чемодан', 'ремонт молнии чемодана',
    'ремонт VIP COLLECTION', 'ремонт ARISTOCRAT', 'ремонт Samsonite Москва',
    'гарантийный ремонт чемодана', 'послегарантийный ремонт чемодана',
    'Сормовский проезд ремонт чемоданов', 'сервис чемоданов Сормовский',
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

export default function RepairPage() {
  const breadcrumbJsonLd = buildBreadcrumbList([
    { name: 'Главная', url: SITE_URL },
    { name: 'Ремонт', url: `${SITE_URL}/repair` },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={REPAIR_SERVICE_JSONLD} />
      <JsonLd data={buildFaqJsonLd(REPAIR_FAQ)} />

      <div className="mx-auto max-w-4xl px-4 py-6">
        <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
          <Link href="/" className="hover:text-accent transition-colors">Главная</Link>
          <ChevronRight size={14} />
          <span className="text-text font-medium">Ремонт</span>
        </nav>

        <div className="bg-surface rounded-xl border border-border p-6 md:p-10">
          <h1 className="text-3xl font-bold mb-6">Ремонт чемоданов в Москве</h1>

          <p className="text-text-muted leading-relaxed mb-4">
            Собственный сервисный центр на <strong>Сормовском проезде, 11</strong> ремонтирует
            чемоданы любых брендов: VIP COLLECTION, ARISTOCRAT, Samsonite, American Tourister,
            Echolac, Polar, Wenger, Heys и других. Используем оригинальные комплектующие
            и универсальные запчасти со склада.
          </p>
          <p className="text-text-muted leading-relaxed mb-8">
            <strong className="text-success">Гарантийный ремонт чемоданов VIP COLLECTION и ARISTOCRAT — бесплатно</strong>{' '}
            в течение 12 месяцев с момента покупки. Послегарантийный ремонт — от 200 ₽ за деталь
            с работой. Простой ремонт делаем при вас за 30–60 минут.
          </p>

          <h2 className="text-xl font-bold mb-4">Виды работ и цены</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {[
              { icon: Settings, title: 'Замена колёс', desc: 'Одинарные и двойные 360°, от 500 ₽ за колесо' },
              { icon: Wrench, title: 'Замена ручек', desc: 'Телескопические и боковые, от 800 ₽' },
              { icon: Settings, title: 'Ремонт молний', desc: 'Замена бегунков и молний целиком, от 300 ₽' },
              { icon: CircleCheck, title: 'Замена замков', desc: 'Кодовые и TSA-замки, от 500 ₽' },
            ].map((item) => (
              <div key={item.title} className="flex gap-3 p-4 bg-bg rounded-xl">
                <item.icon size={20} className="text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm">{item.title}</h3>
                  <p className="text-xs text-text-muted mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-5 bg-accent/5 border border-accent/20 rounded-xl mb-10">
            <h3 className="font-semibold mb-2">Запчасти для самостоятельного ремонта</h3>
            <p className="text-sm text-text-muted mb-3">
              В нашем каталоге — широкий выбор запчастей: колёса, телескопические ручки,
              кодовые и TSA-замки, бегунки. Цены от 200 ₽.
            </p>
            <Link
              href="/catalog/parts"
              className="inline-flex items-center gap-2 text-sm text-accent font-medium hover:underline"
            >
              Перейти в раздел запчастей
            </Link>
          </div>

          <section>
            <h2 className="text-2xl font-bold mb-4">Частые вопросы о ремонте</h2>
            <div className="divide-y divide-border">
              {REPAIR_FAQ.map((item) => (
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
        </div>
      </div>
    </>
  );
}
