import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // 301-редиректы после объединения категорий belts + waist-bags в
    // misc (см. scripts/reorder-categories.ts). Старые ссылки в
    // индексе Яндекса и внешние бэклинки продолжают работать и
    // передают SEO-вес на новый URL.
    return [
      { source: '/catalog/belts', destination: '/catalog/misc', permanent: true },
      { source: '/catalog/belts/:variant', destination: '/catalog/misc', permanent: true },
      { source: '/catalog/waist-bags', destination: '/catalog/misc', permanent: true },
      { source: '/catalog/waist-bags/:variant', destination: '/catalog/misc', permanent: true },
    ];
  },
};

export default nextConfig;
