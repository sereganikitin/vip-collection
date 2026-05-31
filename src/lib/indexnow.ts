// IndexNow — мгновенная отправка изменённых URL в Яндекс и Bing.
// Спецификация: https://www.indexnow.org/documentation
//
// Как работает:
//   1. На сайте лежит файл /indexnow-key.txt с уникальным ключом (тем же, что в env)
//   2. При изменении товара/баннера/категории сервер POST'ит JSON
//      с URL'ами + ключом на api.indexnow.org
//   3. Яндекс и Bing моментально приходят за обновлённой страницей
//      (обычно в течение нескольких часов вместо обычных дней/недель)
//
// Setup:
//   1. Сгенерировать ключ: 32 hex-символа.
//      PowerShell:  -join ((48..57) + (97..102) | Get-Random -Count 32 | % {[char]$_})
//   2. В .env / .env.local положить INDEXNOW_KEY="<сгенерированный ключ>"
//   3. На production задеплоить: проверить, что https://vipcoll.ru/indexnow-key.txt
//      возвращает ключ в text/plain.
//   4. После этого ping() уже работает.

const SITE_HOST = 'vipcoll.ru';
const SITE_ORIGIN = `https://${SITE_HOST}`;
const KEY_LOCATION = `${SITE_ORIGIN}/indexnow-key.txt`;

// Central endpoint раскидывает запрос по всем участникам (Яндекс, Bing).
const ENDPOINT = 'https://api.indexnow.org/indexnow';

export function getIndexNowKey(): string | null {
  return process.env.INDEXNOW_KEY?.trim() || null;
}

interface PingResult {
  ok: boolean;
  status?: number;
  error?: string;
  skipped?: boolean;
}

/**
 * Отправить список URL в IndexNow. Возвращает результат, не бросает исключений —
 * чтобы случайная неудача пинга не ломала основной API (создание товара и т.п.).
 *
 * Лимиты: за один запрос ≤ 10 000 URL. Ставка ≤ ~10 000/день на хост.
 *
 * @example
 *   await pingIndexNow([`${SITE_ORIGIN}/product/chemodan-14101-sweet-pink-s`])
 */
export async function pingIndexNow(urls: string[]): Promise<PingResult> {
  const key = getIndexNowKey();
  if (!key) return { ok: false, skipped: true, error: 'INDEXNOW_KEY not set' };

  const clean = urls
    .filter(Boolean)
    .map((u) => (u.startsWith('http') ? u : `${SITE_ORIGIN}${u.startsWith('/') ? u : `/${u}`}`))
    .slice(0, 10000);

  if (clean.length === 0) return { ok: true };

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Host: 'api.indexnow.org',
      },
      body: JSON.stringify({
        host: SITE_HOST,
        key,
        keyLocation: KEY_LOCATION,
        urlList: clean,
      }),
      // На случай зависания внешнего сервиса
      signal: AbortSignal.timeout(8000),
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    console.error('[indexnow] ping failed:', e);
    return { ok: false, error: String(e) };
  }
}

/**
 * Удобный wrapper: пинг по slug товара.
 */
export function pingProduct(slug: string) {
  return pingIndexNow([`${SITE_ORIGIN}/product/${slug}`]);
}

/**
 * Пинг каталога категории (когда добавили/убрали товар).
 */
export function pingCategory(categorySlug: string) {
  return pingIndexNow([`${SITE_ORIGIN}/catalog/${categorySlug}`]);
}

/**
 * Пинг главной + sitemap (если переделали бренды/баннеры).
 */
export function pingHome() {
  return pingIndexNow([
    `${SITE_ORIGIN}/`,
    `${SITE_ORIGIN}/sitemap.xml`,
  ]);
}
