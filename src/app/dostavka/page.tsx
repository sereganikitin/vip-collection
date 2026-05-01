import type { Metadata } from 'next';
import { ChevronRight, Truck, Package, MapPin, CreditCard, Shield } from 'lucide-react';
import Link from 'next/link';
import { DELIVERY_FAQ } from '@/data/seo-content';
import JsonLd from '@/components/JsonLd';
import { SITE_URL, SITE_NAME, buildBreadcrumbList } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Доставка по Москве и России — VIP COLLECTION',
  description:
    'Доставка чемоданов, сумок и кожгалантереи по Москве (от 100 ₽), бесплатно от 20 000 ₽. Доставка в регионы СДЭК, Почтой России, Яндекс.Доставкой. Самовывоз в Москве. Оплата картой и наличными при получении.',
  keywords: [
    'доставка чемоданов', 'доставка сумок Москва', 'СДЭК чемоданы',
    'почта россии чемодан', 'самовывоз Москва', 'оплата при получении',
    'бесплатная доставка чемоданов', 'Сормовский проезд 11',
  ],
  alternates: { canonical: `${SITE_URL}/dostavka` },
  openGraph: {
    title: 'Доставка по Москве и России — VIP COLLECTION',
    description: 'Доставка по Москве от 100 ₽, бесплатно от 20 000 ₽. СДЭК, Почта России, самовывоз.',
    url: `${SITE_URL}/dostavka`,
    type: 'website',
    locale: 'ru_RU',
    siteName: SITE_NAME,
  },
};

export default function DeliveryPage() {
  const breadcrumbJsonLd = buildBreadcrumbList([
    { name: 'Главная', url: SITE_URL },
    { name: 'Доставка', url: `${SITE_URL}/dostavka` },
  ]);

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: DELIVERY_FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={faqJsonLd} />

      <div className="mx-auto max-w-4xl px-4 py-6">
        <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
          <Link href="/" className="hover:text-accent transition-colors">Главная</Link>
          <ChevronRight size={14} />
          <span className="text-text font-medium">Доставка</span>
        </nav>

        <div className="bg-surface rounded-xl border border-border p-6 md:p-10">
          <h1 className="text-3xl font-bold mb-3">Доставка по Москве и России</h1>
          <p className="text-text-muted leading-relaxed mb-6">
            Доставляем чемоданы, сумки, портфели и аксессуары по всей России. По Москве работают наши курьеры
            и партнёры (Яндекс.Доставка), в регионы отправляем СДЭК, Почтой России и Авито Доставкой. Оплата —
            картой онлайн или при получении.
          </p>

          <div className="space-y-6">
            <div className="flex gap-4 p-5 bg-bg rounded-xl">
              <Truck size={24} className="text-accent flex-shrink-0 mt-1" />
              <div>
                <h2 className="font-semibold text-lg mb-2">Доставка по Москве</h2>
                <p className="text-text-muted text-sm mb-3">Стоимость доставки зависит от типа товара:</p>
                <ul className="space-y-2 text-sm text-text-muted">
                  <li className="flex justify-between max-w-md"><span>Чехлы, сумки на пояс, ремни</span> <span className="font-medium text-text">100 ₽</span></li>
                  <li className="flex justify-between max-w-md"><span>Рюкзаки, сумки для ноутбука, женские сумки</span> <span className="font-medium text-text">250 ₽</span></li>
                  <li className="flex justify-between max-w-md"><span>Чемоданы, кейсы, дорожные сумки</span> <span className="font-medium text-text">500 ₽</span></li>
                </ul>
                <p className="mt-3 text-sm text-success font-medium">Бесплатная доставка от 20 000 ₽ в пределах МКАД!</p>
              </div>
            </div>

            <div className="flex gap-4 p-5 bg-bg rounded-xl">
              <Package size={24} className="text-accent flex-shrink-0 mt-1" />
              <div>
                <h2 className="font-semibold text-lg mb-2">Доставка по России</h2>
                <p className="text-text-muted text-sm mb-3">Мы работаем со следующими транспортными компаниями:</p>
                <ul className="space-y-1 text-sm text-text-muted">
                  <li><strong className="text-text">СДЭК</strong> — курьерская доставка и пункты выдачи, 2-7 дней</li>
                  <li><strong className="text-text">Почта России</strong> — доставка в любой населённый пункт, 5-14 дней</li>
                  <li><strong className="text-text">Яндекс.Доставка</strong> — быстрая доставка по Москве и МО</li>
                  <li><strong className="text-text">Авито Доставка</strong> — для покупок через Авито</li>
                </ul>
                <p className="mt-3 text-sm text-text-muted">Стоимость доставки в регионы рассчитывается индивидуально на этапе оформления заказа.</p>
              </div>
            </div>

            <div className="flex gap-4 p-5 bg-bg rounded-xl">
              <MapPin size={24} className="text-accent flex-shrink-0 mt-1" />
              <div>
                <h2 className="font-semibold text-lg mb-2">Самовывоз</h2>
                <p className="text-text-muted text-sm">
                  Вы можете забрать заказ самостоятельно по адресу:<br />
                  <strong className="text-text">115088, Москва, Сормовский пр-д, 11, стр. 1</strong><br />
                  Предварительно согласуйте время визита по телефону{' '}
                  <a href="tel:+79175741130" className="text-accent hover:underline">+7 (917) 574-11-30</a>{' '}
                  или в Telegram <a href="https://t.me/VIP_CHEMODAN" className="text-accent hover:underline">@VIP_CHEMODAN</a>.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-5 bg-bg rounded-xl">
              <CreditCard size={24} className="text-accent flex-shrink-0 mt-1" />
              <div>
                <h2 className="font-semibold text-lg mb-2">Способы оплаты</h2>
                <ul className="space-y-1 text-sm text-text-muted">
                  <li>Картой онлайн через защищённый платёжный шлюз</li>
                  <li>Наличными или картой курьеру при получении (Москва, самовывоз)</li>
                  <li>Банковский перевод (для юридических лиц)</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-4 p-5 bg-bg rounded-xl">
              <Shield size={24} className="text-accent flex-shrink-0 mt-1" />
              <div>
                <h2 className="font-semibold text-lg mb-2">Гарантия и возврат</h2>
                <p className="text-text-muted text-sm mb-2">
                  На все товары действует гарантия производителя 1 год. Возврат — в течение 14 дней при условии
                  сохранения товарного вида и упаковки.
                </p>
              </div>
            </div>
          </div>

          {/* FAQ block */}
          <section className="mt-10 pt-8 border-t border-border">
            <h2 className="text-2xl font-bold mb-4">Частые вопросы о доставке</h2>
            <div className="divide-y divide-border">
              {DELIVERY_FAQ.map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="flex justify-between items-center cursor-pointer text-base font-medium hover:text-accent transition-colors">
                    {item.q}
                    <ChevronRight size={18} className="transition-transform group-open:rotate-90 flex-shrink-0 ml-2" />
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
