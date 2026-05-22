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
    'Чемоданы VIP COLLECTION на 4 колёсах: надёжные, неубиваемые, цветные, для путешествий. Кейс-пилоты, наборы 3-в-1, размеры S/M/L. Сумки женские David Jones, рюкзаки и сумки для ноутбуков ARISTOCRAT, кожгалантерея NERI KARRA, запчасти. Самовывоз — Сормовский 11, курьер по Москве и Подмосковью.',
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
    'чехол для чемодана', 'самовывоз чемоданов Сормовский',
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
    title: 'Чемоданы на колёсах от 3 500 ₽ — Самовывоз и курьер по Москве',
    description:
      'Чемоданы VIP COLLECTION от 3 500 ₽, рюкзаки и сумки ARISTOCRAT, запчасти. Самовывоз — Сормовский проезд 11. Курьер по Москве и Подмосковью.',
    images: [{ url: '/images/banners/banner-1.jpg', width: 1200, height: 630, alt: 'VIP COLLECTION' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Чемоданы на колёсах от 3 500 ₽ — Москва',
    description: 'Самовывоз на Сормовском, курьер по Москве. Распродажи и акции каждый месяц.',
    images: ['/images/banners/banner-1.jpg'],
  },
  verification: {
    yandex: '61dad71a8d48ef2f',
  },
  other: {
    'yandex:locality': 'Москва',
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
  return (
    <html lang="ru" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <CartProvider>
          <Header categories={categories} contacts={contacts} />
          <main className="flex-1">{children}</main>
          <Footer contacts={contacts} />
        </CartProvider>
        <FeedbackWidget />
        <CookieBanner />
        <YandexMetrika />
      </body>
    </html>
  );
}
