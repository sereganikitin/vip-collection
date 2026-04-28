import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { CartProvider } from '@/context/CartContext';
import YandexMetrika from '@/components/YandexMetrika';

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
  metadataBase: new URL('https://infoseledka.ru'),
  title: {
    default: 'VIP COLLECTION — Купить чемоданы, сумки и кожгалантерею в Москве',
    template: '%s | VIP COLLECTION',
  },
  description:
    'Интернет-магазин VIP COLLECTION: чемоданы из поликарбоната, женские и мужские сумки David Jones, портфели, рюкзаки, портмоне и аксессуары для путешествий. Доставка по Москве и России, гарантия качества, бесплатная доставка от 20 000 ₽.',
  applicationName: 'VIP COLLECTION',
  generator: 'Next.js',
  keywords: [
    'чемоданы', 'купить чемодан', 'чемодан Москва', 'чемодан в Москве',
    'VIP COLLECTION', 'ARISTOCRAT', 'David Jones', 'NERI KARRA',
    'сумки', 'женские сумки', 'мужские сумки', 'портфели', 'рюкзаки',
    'портмоне', 'кожгалантерея', 'аксессуары для путешествий',
    'чемоданы на колесах', 'чемодан поликарбонат', 'кейс-пилот',
    'кожаный портфель', 'дорожная сумка', 'купить рюкзак',
    'интернет-магазин чемоданов', 'магазин кожгалантереи',
    'оптом чемоданы', 'ремонт чемоданов',
  ],
  authors: [{ name: 'VIP COLLECTION', url: 'https://infoseledka.ru' }],
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
    url: 'https://infoseledka.ru',
    siteName: 'VIP COLLECTION',
    title: 'VIP COLLECTION — Купить чемоданы, сумки и кожгалантерею в Москве',
    description:
      'Чемоданы из поликарбоната, сумки David Jones, портфели, рюкзаки, портмоне. Собственные бренды VIP COLLECTION и ARISTOCRAT. Доставка по Москве и России.',
    images: [{ url: '/images/banners/banner-1.jpg', width: 1200, height: 630, alt: 'VIP COLLECTION' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VIP COLLECTION — Чемоданы и кожгалантерея',
    description: 'Чемоданы, сумки, портфели, рюкзаки. Собственные бренды и лучшие производители.',
    images: ['/images/banners/banner-1.jpg'],
  },
  verification: {
    yandex: '8c250c66b18906a1',
  },
  other: {
    'yandex:locality': 'Москва',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <CartProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
        <YandexMetrika />
      </body>
    </html>
  );
}
