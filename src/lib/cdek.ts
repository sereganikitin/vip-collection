// СДЭК API v2 клиент.
//
// Документация: https://api-docs.cdek.ru/29923741.html
// Базовые URL: prod = api.cdek.ru, test = api.edu.cdek.ru
// Авторизация: OAuth2 client_credentials. Token живёт час, мы кэшируем.
//
// Креды и параметры отправителя живут в Setting:
//   cdek_account            — client_id (логин API)
//   cdek_password           — client_secret (secure password)
//   cdek_test_mode          — 'true' для песочницы, иначе prod
//   cdek_sender_city_code   — числовой код города-отправителя (Москва = 44)
//   cdek_sender_address     — адрес ПВЗ/склада отправителя для UI
//
// Безопасность: креды не хардкодим в репозитории, оператор вписывает их
// в /admin/settings.

import { prisma } from '@/lib/prisma';

const PROD_BASE = 'https://api.cdek.ru/v2';
const TEST_BASE = 'https://api.edu.cdek.ru/v2';

// Дефолтные tariff_codes для type=1 (интернет-магазин). Пользователь может
// переопределить через настройки cdek_tariff_pickup / cdek_tariff_door,
// если в его договоре другие.
const DEFAULT_TARIFF_PICKUP = 136; // Посылка склад-склад
const DEFAULT_TARIFF_DOOR   = 137; // Посылка склад-дверь

export interface CdekConfig {
  baseUrl: string;
  account: string;
  password: string;
  senderCityCode: number;
  senderAddress: string;
  tariffPickup: number;
  tariffDoor: number;
  testMode: boolean;
}

export async function getCdekConfig(): Promise<CdekConfig | null> {
  const rows = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          'cdek_account', 'cdek_password', 'cdek_test_mode',
          'cdek_sender_city_code', 'cdek_sender_address',
          'cdek_tariff_pickup', 'cdek_tariff_door',
        ],
      },
    },
  });
  const m = new Map(rows.map((r) => [r.key, r.value]));
  const account = (m.get('cdek_account') ?? '').trim();
  const password = (m.get('cdek_password') ?? '').trim();
  if (!account || !password) return null;

  const testMode = (m.get('cdek_test_mode') ?? 'false') === 'true';
  return {
    baseUrl: testMode ? TEST_BASE : PROD_BASE,
    account,
    password,
    senderCityCode: parseInt(m.get('cdek_sender_city_code') ?? '44', 10) || 44,
    senderAddress: (m.get('cdek_sender_address') ?? 'Москва, Ташкентская 28, стр. 1').trim(),
    tariffPickup: parseInt(m.get('cdek_tariff_pickup') ?? String(DEFAULT_TARIFF_PICKUP), 10) || DEFAULT_TARIFF_PICKUP,
    tariffDoor:   parseInt(m.get('cdek_tariff_door')   ?? String(DEFAULT_TARIFF_DOOR),   10) || DEFAULT_TARIFF_DOOR,
    testMode,
  };
}

// ──────────────────────────────────────────────────────────────
// OAuth token cache. Token живёт 3600 сек.
// ──────────────────────────────────────────────────────────────

let tokenCache: { token: string; expiresAt: number; account: string } | null = null;

async function getAuthToken(cfg: CdekConfig): Promise<string | null> {
  if (tokenCache && tokenCache.account === cfg.account && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  // CDEK документация: POST /oauth/token с form-encoded body.
  // Раньше слал параметры в query string — формально допустимо, но
  // некоторые edge-балансировщики Яндекс-CDN режут такие запросы.
  const body = new URLSearchParams();
  body.set('grant_type', 'client_credentials');
  body.set('client_id', cfg.account);
  body.set('client_secret', cfg.password);

  try {
    const res = await fetch(`${cfg.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text().catch(() => '');
    if (!res.ok) {
      console.error(`[cdek] OAuth failed: HTTP ${res.status}, body: ${text.slice(0, 500)}`);
      return null;
    }
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(text); } catch {
      console.error('[cdek] OAuth response is not JSON:', text.slice(0, 300));
      return null;
    }
    const token = String(data.access_token ?? '');
    if (!token) {
      console.error('[cdek] OAuth: нет access_token в ответе:', text.slice(0, 300));
      return null;
    }
    const expiresIn = Math.max(60, Number(data.expires_in ?? 3600) - 60);
    tokenCache = { token, expiresAt: Date.now() + expiresIn * 1000, account: cfg.account };
    console.log(`[cdek] OAuth OK (token cached for ${expiresIn}s)`);
    return token;
  } catch (e) {
    console.error('[cdek] OAuth fetch error:', e);
    return null;
  }
}

async function cdekFetch(
  cfg: CdekConfig,
  path: string,
  opts: { method?: string; body?: unknown } = {}
): Promise<Response | null> {
  const token = await getAuthToken(cfg);
  if (!token) return null;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };
  if (opts.body) headers['Content-Type'] = 'application/json';

  try {
    return await fetch(`${cfg.baseUrl}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    console.error(`[cdek] fetch error for ${path}:`, e);
    return null;
  }
}

// ──────────────────────────────────────────────────────────────
// Поиск кода города по имени
// ──────────────────────────────────────────────────────────────

export interface CdekCityMatch {
  code: number;
  city: string;
  region?: string;
  countryCode?: string;
}

export async function findCdekCity(name: string): Promise<CdekCityMatch | null> {
  const cfg = await getCdekConfig();
  if (!cfg) return null;

  const url = `/location/cities?country_codes=RU&city=${encodeURIComponent(name)}&size=5`;
  const res = await cdekFetch(cfg, url);
  if (!res || !res.ok) {
    if (res) console.warn(`[cdek] find city HTTP ${res.status} for "${name}"`);
    return null;
  }
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  // Берём первый российский результат, если есть.
  const ru = data.find((c) => (c.country_code as string) === 'RU') ?? data[0];
  if (!ru || typeof ru.code !== 'number') return null;
  return {
    code: ru.code,
    city: String(ru.city ?? name),
    region: ru.region ? String(ru.region) : undefined,
    countryCode: ru.country_code ? String(ru.country_code) : undefined,
  };
}

// ──────────────────────────────────────────────────────────────
// ПВЗ СДЭК для города
// ──────────────────────────────────────────────────────────────

export interface CdekPickupPoint {
  code: string;
  name?: string;
  address: string;
  workTime?: string;
  lat?: number;
  lng?: number;
}

export async function listCdekPickupPoints(cityCode: number): Promise<{
  ok: boolean;
  points?: CdekPickupPoint[];
  error?: string;
}> {
  const cfg = await getCdekConfig();
  if (!cfg) return { ok: false, error: 'СДЭК не настроен (нет account/password в /admin/settings)' };

  const url = `/deliverypoints?city_code=${cityCode}&country_code=RU&type=PVZ&is_handout=true`;
  const res = await cdekFetch(cfg, url);
  if (!res) return { ok: false, error: 'СДЭК API недоступен' };
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, error: `СДЭК HTTP ${res.status}: ${text.slice(0, 300)}` };
  }
  const data = await res.json();
  if (!Array.isArray(data)) return { ok: false, error: 'Неожиданный формат ответа' };

  const points: CdekPickupPoint[] = data.map((p: Record<string, unknown>) => {
    const loc = p.location as Record<string, unknown> | undefined;
    return {
      code: String(p.code ?? ''),
      name: (p.name as string) ?? undefined,
      address: (loc?.address_full as string) ?? (loc?.address as string) ?? '',
      workTime: (p.work_time as string) ?? undefined,
      lat: typeof loc?.latitude === 'number' ? (loc.latitude as number) : undefined,
      lng: typeof loc?.longitude === 'number' ? (loc.longitude as number) : undefined,
    };
  }).filter((p) => p.code);

  return { ok: true, points };
}

// ──────────────────────────────────────────────────────────────
// Расчёт стоимости
// ──────────────────────────────────────────────────────────────

export interface CdekQuote {
  tariffCode: number;
  tariffName?: string;
  priceRub: number;
  periodMinDays?: number;
  periodMaxDays?: number;
  raw?: unknown;
}

export interface CdekQuoteInput {
  toCityCode: number;
  /** Габариты упаковки в сумме (мы вычислили заранее в коде вызова). */
  weightGr: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  /** 'pickup' — посылка склад-склад, 'door' — посылка склад-дверь. */
  mode: 'pickup' | 'door';
}

export async function calculateCdekQuote(input: CdekQuoteInput): Promise<{
  ok: boolean;
  quote?: CdekQuote;
  error?: string;
}> {
  const cfg = await getCdekConfig();
  if (!cfg) return { ok: false, error: 'СДЭК не настроен' };

  const tariffCode = input.mode === 'pickup' ? cfg.tariffPickup : cfg.tariffDoor;

  const body = {
    type: 1, // интернет-магазин — даёт коммерческую цену
    tariff_code: tariffCode,
    from_location: { code: cfg.senderCityCode },
    to_location: { code: input.toCityCode },
    packages: [
      {
        weight: Math.max(input.weightGr, 100), // минимум 100 г, иначе СДЭК ругается
        length: Math.max(1, Math.round(input.lengthCm)),
        width:  Math.max(1, Math.round(input.widthCm)),
        height: Math.max(1, Math.round(input.heightCm)),
      },
    ],
  };

  const res = await cdekFetch(cfg, '/calculator/tariff', { method: 'POST', body });
  if (!res) return { ok: false, error: 'СДЭК API недоступен' };
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[cdek] calc failed:', res.status, text.slice(0, 500));
    return { ok: false, error: `СДЭК HTTP ${res.status}: ${text.slice(0, 300)}` };
  }
  const data = await res.json();

  const priceRub = parseFloat(String(data.total_sum ?? data.delivery_sum ?? 0));
  if (!Number.isFinite(priceRub) || priceRub <= 0) {
    // Сёрвис может вернуть errors[] вместо суммы
    const errs = (data.errors as Array<Record<string, unknown>>) ?? [];
    if (errs.length > 0) {
      const msg = errs.map((e) => e.message ?? e.code).filter(Boolean).join('; ');
      return { ok: false, error: msg || 'Ошибка расчёта СДЭК' };
    }
    return { ok: false, error: 'СДЭК не вернул цену' };
  }

  return {
    ok: true,
    quote: {
      tariffCode,
      priceRub,
      periodMinDays: typeof data.period_min === 'number' ? data.period_min : undefined,
      periodMaxDays: typeof data.period_max === 'number' ? data.period_max : undefined,
      raw: data,
    },
  };
}
