import type { MetadataRoute } from 'next';

const BASE_URL = 'https://infoseledka.ru';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/*', '/api/*', '/cart', '/checkout'],
      },
      {
        userAgent: 'Yandex',
        allow: '/',
        disallow: ['/admin', '/admin/*', '/api/*', '/cart', '/checkout'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: 'infoseledka.ru',
  };
}
