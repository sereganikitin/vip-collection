import type { MetadataRoute } from 'next';

// Robots.txt — открытый сайт для индексации поисковиками и ответов LLM.
// Закрыты только админка, API, корзина и чекаут.
// AI-боты разрешены явно: чтобы Perplexity, ChatGPT Search, Claude, Google Gemini
// могли цитировать сайт в генеративных ответах (GEO).
export default function robots(): MetadataRoute.Robots {
  const blocked = ['/admin', '/admin/*', '/api/*', '/cart', '/checkout'];

  return {
    rules: [
      // Общее правило
      { userAgent: '*', allow: '/', disallow: blocked },

      // Поисковики: явно разрешаем
      { userAgent: 'Yandex', allow: '/', disallow: blocked },
      { userAgent: 'YandexBot', allow: '/', disallow: blocked },
      { userAgent: 'Googlebot', allow: '/', disallow: blocked },
      { userAgent: 'Googlebot-Image', allow: '/', disallow: blocked },
      { userAgent: 'Bingbot', allow: '/', disallow: blocked },
      { userAgent: 'DuckDuckBot', allow: '/', disallow: blocked },

      // AI-боты для GEO: явно разрешаем
      { userAgent: 'GPTBot', allow: '/', disallow: blocked },
      { userAgent: 'OAI-SearchBot', allow: '/', disallow: blocked },
      { userAgent: 'ChatGPT-User', allow: '/', disallow: blocked },
      { userAgent: 'ClaudeBot', allow: '/', disallow: blocked },
      { userAgent: 'Claude-Web', allow: '/', disallow: blocked },
      { userAgent: 'anthropic-ai', allow: '/', disallow: blocked },
      { userAgent: 'PerplexityBot', allow: '/', disallow: blocked },
      { userAgent: 'Perplexity-User', allow: '/', disallow: blocked },
      { userAgent: 'Google-Extended', allow: '/', disallow: blocked },
      { userAgent: 'Applebot-Extended', allow: '/', disallow: blocked },
      { userAgent: 'YandexAdditional', allow: '/', disallow: blocked },
      { userAgent: 'CCBot', allow: '/', disallow: blocked },
      { userAgent: 'cohere-ai', allow: '/', disallow: blocked },
      { userAgent: 'Meta-ExternalAgent', allow: '/', disallow: blocked },
    ],
    sitemap: 'https://vipcoll.ru/sitemap.xml',
    host: 'https://vipcoll.ru',
  };
}
