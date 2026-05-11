import type { MetadataRoute } from 'next';

// Secondary site — most pages are noindex via <meta>. robots.txt itself
// allows crawling so search engines can fetch the open pages (home and
// content pages), and follow noindex meta on catalog/product pages.
// Admin and API are always closed.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/*', '/api/*', '/cart', '/checkout'],
      },
    ],
    sitemap: 'https://vipcoll.ru/sitemap.xml',
  };
}
