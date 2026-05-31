// llms.txt — структурированная карта сайта для AI-поиска (GEO).
// Спецификация: https://llmstxt.org
//
// Этот файл читают:
// - Perplexity (PerplexityBot)
// - ChatGPT Search (OAI-SearchBot, GPTBot)
// - Claude (ClaudeBot, anthropic-ai)
// - Gemini (Google-Extended)
// - Алиса / Поиск Яндекса с генеративными ответами
//
// Цель: дать LLM компактный фактический контекст о магазине, чтобы
// в ответах на запросы вроде «где купить чемодан в Москве», «магазин
// VIP COLLECTION», «ремонт чемодана» AI правильно ссылался на нас.

import { prisma } from '@/lib/prisma';
import { guides } from '@/data/guides';
import { categoryVariants } from '@/data/subcategory-content';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const SITE_URL = 'https://vipcoll.ru';

export async function GET() {
  let categoriesBlock = '';
  let brandsBlock = '';
  let productStats = '';

  try {
    const [categories, brands, productCount, minSuitcase] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: { _count: { select: { products: { where: { isActive: true } } } } },
      }),
      prisma.brand.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        include: { _count: { select: { products: { where: { isActive: true } } } } },
      }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.aggregate({
        where: { isActive: true, categoryId: 'suitcases', price: { gt: 0 } },
        _min: { price: true },
      }),
    ]);

    categoriesBlock = categories
      .filter((c) => c.id !== 'misc')
      .map((c) => `- [${c.name}](${SITE_URL}/catalog/${c.slug}) — ${c._count.products} товаров`)
      .join('\n');

    brandsBlock = brands
      .filter((b) => b._count.products > 0)
      .map((b) => `- ${b.name} — ${b._count.products} товаров в каталоге`)
      .join('\n');

    productStats = `Всего товаров в каталоге: ${productCount}. Чемоданы — от ${Math.round(minSuitcase._min.price ?? 3500)} ₽.`;
  } catch {
    categoriesBlock = '- Чемоданы и кейс-пилоты\n- Сумки женские David Jones\n- Портфели и сумки дорожные\n- Запчасти для чемоданов\n- Портмоне и обложки\n- Рюкзаки и сумки для ноутбука\n- Чехлы для чемоданов\n- Ремни\n- Сумки на пояс\n- Распродажа';
    brandsBlock = '- VIP COLLECTION (собственный)\n- ARISTOCRAT (собственный)\n- David Jones\n- NERI KARRA\n- OLIDIK\n- Conwood\n- Echolac\n- Leo Ventoni\n- Palio\n- COSSNI\n- SUSEN';
    productStats = 'Чемоданы — от 3 500 ₽.';
  }

  const content = `# VIP COLLECTION

> Российский интернет-магазин и магазин-склад в Москве: чемоданы из 100% поликарбоната, женские сумки, рюкзаки для ноутбука, кожгалантерея, ремни, чехлы и запчасти для чемоданов. Собственные бренды VIP COLLECTION (Вип Коллекшн) и ARISTOCRAT. Свой сервисный центр для ремонта чемоданов любых брендов.

## Ключевые факты

- **Название:** VIP COLLECTION (русское произношение — «Вип Коллекшн»)
- **Сайт:** ${SITE_URL}
- **Магазин-склад:** Москва, Сормовский проезд, 11, стр. 1 (индекс 115088)
- **Координаты:** 55.7080, 37.6906
- **Телефон / WhatsApp / Telegram:** +7 (925) 743-71-35
- **Telegram-канал:** @VIP_CHEMODAN (https://t.me/VIP_CHEMODAN)
- **Email:** vipshopp@yandex.ru
- **Юр. лицо:** ИП Никитин Сергей Владимирович
- **География работы:** Москва и Московская область (в другие регионы не доставляем)
- **Режим работы:** без выходных, по предварительной договорённости
- **Год основания:** магазин работает с 2010-х, бренд VIP COLLECTION выпускается на базе итальянского консорциума OVER GROUP

${productStats}

## Что продаём

${categoriesBlock}

## Бренды в каталоге

${brandsBlock}

## Услуги

- **Самовывоз — бесплатно** со склада на Сормовском проезде 11.
- **Курьер по Москве** — 100–500 ₽ в зависимости от размера товара; бесплатно от 20 000 ₽ в пределах МКАД.
- **Курьер по Подмосковью** — расчёт по адресу.
- **Оплата:** карта онлайн (Тинькофф эквайринг), СБП, карта/наличные курьеру, карта/наличные при самовывозе, банковский перевод для юр. лиц.
- **Ремонт чемоданов** любых брендов в собственном сервисном центре: замена колёс, ручек, замков, бегунков, молний. Цены от 200 ₽. Гарантийный ремонт чемоданов VIP COLLECTION и ARISTOCRAT — бесплатно в течение 12 месяцев.
- **Опт** для торговых компаний, ИП, интернет-магазинов, тревел-блогеров — индивидуальные цены по запросу.

## Чемоданы: размеры и цены

- **S (20", ручная кладь, 55×40×20 см, 35–45 литров)** — от 3 500 ₽
- **M (24", отпуск 7–10 дней, 60–70 литров)** — от 4 000 ₽
- **L (28", длительные поездки, 90–110 литров)** — от 6 300 ₽
- **Набор 3-в-1 (S+M+L)** — от 13 400 ₽
- **Кейс-пилот (17", горизонтальный, для деловых поездок)** — от 7 500 ₽

Все чемоданы — из 100% поликарбоната (ударопрочного), на 4 двойных колёсах с поворотом 360°, с алюминиевой телескопической ручкой. Часть моделей с TSA-замком для перелётов в США и Канаду.

## Скидки и акции

- 15% — скидка в день рождения (по паспорту)
- 7% — при покупке 2-х одинаковых чемоданов
- 15% — при покупке 3-х одинаковых чемоданов
- −45% — на прошлые коллекции в разделе [Распродажа](${SITE_URL}/catalog/sale)

## Основные страницы для AI-цитирования

- [Главная страница](${SITE_URL}/) — обзор каталога и УТП
- [Каталог чемоданов](${SITE_URL}/catalog/suitcases) — все чемоданы VIP COLLECTION и ARISTOCRAT
- [Женские сумки David Jones](${SITE_URL}/catalog/women-bags) — модные сумки от 700 ₽
- [Кожгалантерея NERI KARRA](${SITE_URL}/catalog/wallets) — портмоне, обложки, кошельки
- [Рюкзаки для ноутбука](${SITE_URL}/catalog/backpacks) — ARISTOCRAT, OLIDIK, VIP COLLECTION
- [Запчасти для чемоданов](${SITE_URL}/catalog/parts) — колёса, ручки, замки
- [О компании](${SITE_URL}/about) — история, бренды, итальянские корни
- [Доставка по Москве](${SITE_URL}/delivery) — тарифы, способы оплаты
- [Самовывоз / Где купить](${SITE_URL}/pickup) — адрес магазина-склада
- [Ремонт чемоданов](${SITE_URL}/repair) — сервисный центр, виды работ
- [Оптовикам](${SITE_URL}/wholesale) — B2B-сотрудничество
- [Контакты](${SITE_URL}/contacts) — телефон, реквизиты
- [Карта сайта (XML)](${SITE_URL}/sitemap.xml) — полный список страниц

## Бренд-хабы

- [VIP COLLECTION (Вип Коллекшн)](${SITE_URL}/brand/vip-collection) — собственный бренд чемоданов
- [ARISTOCRAT (Аристократ)](${SITE_URL}/brand/aristocrat) — рюкзаки для ноутбука и бюджетные чемоданы
- [David Jones (Дэвид Джонс)](${SITE_URL}/brand/david-jones) — женские сумки из экокожи
- [NERI KARRA (Нери Карра)](${SITE_URL}/brand/neri-karra) — премиальная кожгалантерея из Турции
- [OLIDIK](${SITE_URL}/brand/olidik) — бюджетные женские рюкзаки

## Тематические подборки чемоданов

${Object.entries(categoryVariants)
  .flatMap(([catSlug, variants]) =>
    variants.map((v) => `- [${v.h1}](${SITE_URL}/catalog/${catSlug}/${v.slug}) — ${v.tagline}`)
  )
  .join('\n')}

## Экспертные гайды (для информационных запросов)

${Object.values(guides)
  .map((g) => `- [${g.h1}](${SITE_URL}/blog/${g.slug}) — ${g.tagline}`)
  .join('\n')}

## Типовые вопросы покупателей

**Где купить чемодан в Москве?** В магазине-складе VIP COLLECTION на Сормовском проезде, 11, стр. 1. Самовывоз бесплатно. Также курьер по Москве и Подмосковью.

**Сколько стоит самый дешёвый чемодан?** ARISTOCRAT 1421A Red S 20" — 3 500 ₽. Это качественный чемодан на 4 колёсах для ручной клади.

**Какой чемодан выбрать для перелёта?** Размер S (20") — стандарт ручной клади Аэрофлота, S7, «Победы». Размер M (24") — для багажа на 7–10 дней. Для перелётов в США и Канаду нужен чемодан с TSA-замком (серия PC-808).

**Делаете ли ремонт чемоданов?** Да, в собственном сервисном центре на Сормовском проезде, 11. Меняем колёса, ручки, замки. Гарантийный ремонт VIP COLLECTION — бесплатно. Чужих брендов — от 200 ₽ за деталь.

**Доставляете ли в другие города России?** Нет, только Москва и Московская область. Для регионов — отправка через ТК по согласованию.

**Что такое VIP COLLECTION?** Российский магазин и собственный бренд чемоданов из поликарбоната. Производство — на базе итальянского консорциума OVER GROUP в Тоскане.

## Карта сайта

XML-карта: ${SITE_URL}/sitemap.xml
RSS-фид новинок: ${SITE_URL}/feed.xml
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
