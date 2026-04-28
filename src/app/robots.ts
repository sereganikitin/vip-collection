import type { MetadataRoute } from 'next';

const BASE_URL = 'https://infoseledka.ru';

export default function robots(): MetadataRoute.Robots {
  const disallow = ['/admin', '/admin/*', '/api/*', '/cart', '/checkout'];

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow,
      },
      {
        userAgent: 'Yandex',
        allow: '/',
        disallow,
      },
      {
        userAgent: 'YandexBot',
        allow: '/',
        disallow,
      },
      {
        userAgent: 'YandexImages',
        allow: '/',
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow,
      },
      {
        userAgent: 'Googlebot-Image',
        allow: '/',
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: 'infoseledka.ru',
  };
}
