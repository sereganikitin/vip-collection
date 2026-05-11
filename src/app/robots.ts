import type { MetadataRoute } from 'next';

// Secondary site — closed from indexing. Primary site is vip-collection.ru.
// Yandex.Market feed (/feed.xml) is allowed so the merchant cabinet can pull it.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        disallow: '/',
        allow: '/feed.xml',
      },
    ],
  };
}
