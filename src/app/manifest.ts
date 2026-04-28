import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VIP COLLECTION — Чемоданы и кожгалантерея',
    short_name: 'VIP COLLECTION',
    description:
      'Интернет-магазин чемоданов, сумок и кожгалантереи. Собственные бренды VIP COLLECTION и ARISTOCRAT.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8f8fa',
    theme_color: '#62221C',
    lang: 'ru',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '16x16',
        type: 'image/x-icon',
      },
    ],
  };
}
