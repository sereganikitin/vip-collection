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
    default: 'Чемоданы на колёсах от 3 500 ₽ — Купить с самовывозом в Москве | VIP COLL',
    template: '%s | VIP COLL',
  },
  description:
    'Чемоданы VIP COLLECTION от 3 500 ₽, рюкзаки и сумки ARISTOCRAT, портмоне NERI KARRA, запчасти. Самовывоз — Сормовский проезд 11, Москва. Курьер по Москве и Подмосковью, от 20 000 ₽ бесплатно.',
  applicationName: 'VIP COLLECTION',
  generator: 'Next.js',
  keywords: [
    'купить чемодан недорого', 'чемодан москва', 'чемодан со скидкой',
    'распродажа чемоданов', 'чемодан в самолёт', 'чемодан ручная кладь',
    'рюкзак для ноутбука', 'рюкзак купить москва',
    'сумка на пояс', 'поясная сумка для бега',
    'запчасти для чемодана', 'ремонт чемоданов москва',
    'VIP COLLECTION чемодан', 'ARISTOCRAT рюкзак', 'ARISTOCRAT сумка', 'David Jones сумка',
    'чехол для чемодана', 'набор чемоданов',
    'самовывоз чемоданов сормовский',
    'магазин чемоданов недорого', 'курьер москва доставка',
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
        <CookieBanner />
        <YandexMetrika />
      </body>
    </html>
  );
}
