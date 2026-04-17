import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { CartProvider } from '@/context/CartContext';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://infoseledka.ru'),
  title: {
    default: 'VIP COLLECTION — Интернет-магазин чемоданов и кожгалантереи',
    template: '%s | VIP COLLECTION',
  },
  description:
    'Чемоданы, сумки, портфели, рюкзаки, портмоне и аксессуары для путешествий. Собственные бренды VIP COLLECTION и ARISTOCRAT. Доставка по Москве и России.',
  keywords: [
    'чемоданы', 'купить чемодан', 'VIP COLLECTION', 'ARISTOCRAT',
    'сумки', 'портфели', 'рюкзаки', 'портмоне', 'кожгалантерея',
    'David Jones', 'NERI KARRA', 'аксессуары для путешествий',
    'чемоданы на колесах', 'поликарбонат', 'Москва',
  ],
  authors: [{ name: 'VIP COLLECTION' }],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: 'https://infoseledka.ru',
    siteName: 'VIP COLLECTION',
    title: 'VIP COLLECTION — Интернет-магазин чемоданов и кожгалантереи',
    description:
      'Чемоданы, сумки, портфели, рюкзаки, портмоне и аксессуары для путешествий. Собственные бренды VIP COLLECTION и ARISTOCRAT.',
    images: [{ url: '/images/banners/banner-1.jpg', width: 1200, height: 630, alt: 'VIP COLLECTION' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VIP COLLECTION — Чемоданы и кожгалантерея',
    description: 'Чемоданы, сумки, портфели, рюкзаки. Собственные бренды и лучшие производители.',
    images: ['/images/banners/banner-1.jpg'],
  },
  verification: {
    yandex: 'REPLACE_WITH_YANDEX_VERIFICATION_CODE',
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
      </body>
    </html>
  );
}
