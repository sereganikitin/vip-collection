import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { CartProvider } from '@/context/CartContext';
import YandexMetrika from '@/components/YandexMetrika';
import { getCategoriesForFrontend } from '@/lib/categories';
import { getSiteContacts } from '@/lib/settings';
import CookieBanner from '@/components/CookieBanner';
import FeedbackWidget from '@/components/FeedbackWidget';
import JsonLd from '@/components/JsonLd';
import { DEVELOPER_JSONLD, SITE_DEVELOPER } from '@/lib/seo';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#62221C',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://vipcoll.ru'),
  title: {
    default: 'Купить чемодан в Москве — надёжные чемоданы на 4 колёсах VIP COLLECTION от 3 500 ₽',
    template: '%s | VIP COLLECTION',
  },
  description:
    'Чемоданы VIP COLLECTION на 4 колёсах: надёжные, неубиваемые, цветные, для путешествий. Кейс-пилоты, наборы 3-в-1, размеры S/M/L. Сумки женские David Jones, рюкзаки и сумки для ноутбуков ARISTOCRAT, кожгалантерея NERI KARRA, запчасти. Курьер по Москве и Я.Доставка по всей России.',
  applicationName: 'VIP COLLECTION',
  generator: 'Next.js',
  keywords: [
    // основной кластер «чемодан»
    'купить чемодан', 'купить чемодан в Москве', 'надёжные чемоданы', 'надежные чемоданы',
    'неубиваемый чемодан', 'чемодан на колёсах', 'чемодан на колесах',
    'чемодан на 4 колёсах', 'чемодан на 4-х колёсах', 'чемодан на 4-х колесах',
    'чемоданы для путешествий', 'чемоданы цветные', 'цветной чемодан',
    'кейс-пилот', 'кейс-пилоты', 'кейс-пилот для поездки',
    'чемоданы VIP', 'чемоданы Вип', 'VIP COLLECTION', 'VIP COLLECTION чемодан',
    'чемоданы вип коллекшн', 'чемоданы Вип Коллекшн', 'vip коллекшн чемоданы',
    'чемоданы на колесиках', 'чемодан на колесиках',
    'чемоданы на четырех колесах', 'чемодан на четырех колесах',
    'набор чемоданов', 'чемодан в самолёт', 'чемодан ручная кладь',
    'чемодан Москва', 'купить чемодан недорого', 'распродажа чемоданов',
    // кожгалантерея и аксессуары
    'кожгалантерея', 'кожгалантерея Москва', 'купить кожгалантерею',
    'портмоне', 'NERI KARRA', 'обложка для паспорта',
    // сумки женские / рюкзаки
    'сумки женские', 'женские сумки', 'купить женскую сумку',
    'David Jones', 'David Jones сумка',
    'рюкзаки', 'рюкзак для ноутбука', 'сумки для ноутбуков', 'ARISTOCRAT рюкзак',
    // запчасти и ремонт
    'запчасти для чемоданов', 'запчасти для чемодана',
    'колесо для чемодана', 'ремонт чемоданов москва',
    // прочее
    'чехол для чемодана', 'доставка чемоданов по России',
    'Яндекс Доставка', 'я доставка чемоданы',
  ],
  authors: [{ name: 'VIP COLLECTION', url: 'https://vipcoll.ru' }],
  creator: 'VIP COLLECTION',
  publisher: 'VIP COLLECTION',
  formatDetection: { email: false, address: false, telephone: false },
  category: 'shopping',
  classification: 'Интернет-магазин',
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: 'https://vipcoll.ru',
    siteName: 'VIP COLLECTION',
    title: 'Чемоданы на колёсах от 3 500 ₽ — Курьер по Москве и доставка по России',
    description:
      'Чемоданы VIP COLLECTION от 3 500 ₽, рюкзаки и сумки ARISTOCRAT, запчасти. Курьер по Москве и Я.Доставка по всей России.',
    images: [{ url: '/images/banners/banner-1.jpg', width: 1200, height: 630, alt: 'VIP COLLECTION' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Чемоданы на колёсах от 3 500 ₽ — Москва',
    description: 'Курьер по Москве и Я.Доставка по России. Распродажи и акции каждый месяц.',
    images: ['/images/banners/banner-1.jpg'],
  },
  verification: {
    yandex: '61dad71a8d48ef2f',
  },
  other: {
    'yandex:locality': 'Москва',
    // Разработчик сайта — SEO-метаданные, не отображаются пользователю.
    // Поисковики и LLM читают meta-теги в <head>.
    'developer': 'ИП Никитин С.В. — Веб-разработка',
    'developer-url': 'https://web.cd-agency.ru/',
    'developer-telephone': '+79257437135',
    'developer-telegram': 'https://t.me/web_cdagency/',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [categories, contacts] = await Promise.all([
    getCategoriesForFrontend(),
    getSiteContacts(),
  ]);
  // Скрытый блок с информацией о разработчике.
  // Видим поисковикам и LLM, не отображается на экране пользователю.
  const devCredit = `Веб-разработка: ${SITE_DEVELOPER.legalName} · ${SITE_DEVELOPER.url} · ${SITE_DEVELOPER.telephone} · ${SITE_DEVELOPER.telegram}`;

  return (
    <html lang="ru" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        {/* JSON-LD разработчика — на КАЖДОЙ странице сайта. */}
        <JsonLd data={DEVELOPER_JSONLD} />
        <CartProvider>
          <Header categories={categories} contacts={contacts} />
          <main className="flex-1">{children}</main>
          <Footer contacts={contacts} />
        </CartProvider>
        <FeedbackWidget />
        <CookieBanner />
        <YandexMetrika />
        {/* HTML-комментарий с кредитом разработчика — виден в исходниках страницы (view-source) и парсерам, но не на экране. */}
        <div dangerouslySetInnerHTML={{ __html: `<!-- ${devCredit} -->` }} />
      </body>
    </html>
  );
}
