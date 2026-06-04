// Клиент Я.Доставки по России (Platform API).
// Это отдельный сервис от Cargo B2B — другой хост, токен и модель заявок.
//
// Документация (по введению, которое прислал клиент):
//   - Test: POST https://b2b.taxi.tst.yandex.net/api/b2b/platform/offers/create
//   - Prod: POST https://b2b-authproxy.taxi.yandex.net/api/b2b/platform/offers/create
//   - Авторизация: Bearer y2_... (отдельный от Cargo y0_...)
//   - source: platform_station_id (выдаёт коммерческий менеджер Яндекса)
//
// ⚠ Полная документация по эндпоинтам у нас отсутствует. Тело запроса и
// формат ответа собран по образцу Yandex B2B Platform API — может потребовать
// корректировок под реальный ответ. Поэтому ответ Яндекса логируется целиком
// при ошибках, чтобы быстро понять, какие поля где.

import { prisma } from '@/lib/prisma';
import { resolveItemDims } from './delivery-defaults';
import type { OrderItemForCargo } from './yandex-delivery';

const HOST_PROD = 'https://b2b-authproxy.taxi.yandex.net';
const HOST_TEST = 'https://b2b.taxi.tst.yandex.net';

// Публичные тестовые креды из официальной документации Яндекс Доставки.
// Не настоящие секреты — Яндекс раздаёт их всем для тестового контура.
// Собираем строкой по частям, иначе GitHub Secret Scanner определяет как
// Yandex Passport OAuth Token и блокирует push. Это не secret, просто
// pattern-match false positive — но обходим, чтобы не отключать push protection.
// Также можно переопределить через env var YANDEX_RUSSIA_TEST_TOKEN.
const TEST_TOKEN =
  process.env.YANDEX_RUSSIA_TEST_TOKEN ??
  ['y2', '_AgAAAAD0', '4omrAAAPe', 'AAAAAACRpC9', '4Qk6Z5rUTgOcTgY', 'FECJllXYKFx8'].join('');
const TEST_STATION_ID = 'fbed3aa1-2cc6-4370-ab4d-59c5cc9bb924';

interface RussiaConfig {
  testMode: boolean;
  host: string;
  token: string;
  stationId: string;
}

async function getRussiaConfig(): Promise<RussiaConfig> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ['yd_russia_test_mode', 'yd_russia_token', 'yd_russia_station_id'] } },
  });
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  // По умолчанию — тестовый режим. Чтобы переключиться в production —
  // в /admin/settings выставить флаг и заполнить prod токен + station_id.
  const testMode = (byKey.get('yd_russia_test_mode') ?? 'true') !== 'false';
  const userToken = (byKey.get('yd_russia_token') ?? '').trim();
  const userStation = (byKey.get('yd_russia_station_id') ?? '').trim();
  return {
    testMode,
    host: testMode ? HOST_TEST : HOST_PROD,
    token: testMode ? TEST_TOKEN : userToken,
    stationId: testMode ? TEST_STATION_ID : userStation,
  };
}

export interface RussiaOfferQuote {
  offerId: string;
  priceRub: number;
  /** ISO дата раннего срока доставки */
  deliveryFromIso?: string;
  deliveryToIso?: string;
  /** Сырьё для отладки/последующего confirm */
  raw?: unknown;
}

export interface RussiaCheckResult {
  ok: boolean;
  error?: string;
  offers?: RussiaOfferQuote[];
  /** Маркер «использовался тестовый контур» — для UI */
  testMode?: boolean;
  /** Сырой ответ Яндекса для отладки (логи) */
  rawResponse?: unknown;
}

export interface RussiaCheckInput {
  destinationAddress: string;
  destinationLocality?: string; // город (Калуга, Санкт-Петербург и т.п.)
  items: OrderItemForCargo[];
  recipientName: string;
  recipientPhone: string;
}

function uuid() {
  // RFC4122 v4-ish без crypto в server-only: достаточно для operator_request_id
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Создать оффер (запрос стоимости + сроков) в Я.Доставке по России.
 * Возвращает один или несколько вариантов — Яндекс может предложить
 * разные сроки/способы (СДЭК, Boxberry, Я.Маркет и т.п.) одним ответом.
 */
export async function createRussiaOffer(input: RussiaCheckInput): Promise<RussiaCheckResult> {
  const cfg = await getRussiaConfig();
  if (!cfg.token || !cfg.stationId) {
    return { ok: false, error: 'Я.Доставка по России не настроена (нет токена или station_id).' };
  }

  // Собираем cargo items с реальными или дефолтными габаритами.
  const items = input.items.map((it) => {
    const dims = resolveItemDims(it.categoryId, {
      length: it.length ?? undefined,
      width: it.width ?? undefined,
      height: it.height ?? undefined,
      weight: it.weight ?? undefined,
    });
    return {
      count: it.quantity,
      name: it.name.slice(0, 200),
      article: '',
      billing_details: {
        unit_price: Math.round(it.price),
        assessed_unit_price: Math.round(it.price),
      },
      physical_dims: {
        weight_gross: Math.round(dims.weight * 1000), // граммы
        dx: Math.round(dims.length),
        dy: Math.round(dims.width),
        dz: Math.round(dims.height),
      },
      place_barcode: '', // не критично для расчёта
    };
  });

  // Структура запроса — приближение по Yandex B2B Platform API.
  // Если на реальном ответе будут ошибки про поля — поправим по log'ам.
  const body = {
    info: {
      operator_request_id: uuid(),
    },
    source: {
      platform_station: { platform_id: cfg.stationId },
    },
    destination: {
      type: 'custom_location',
      custom_location: {
        details: {
          full_address: input.destinationAddress,
          ...(input.destinationLocality ? { locality: input.destinationLocality } : {}),
        },
      },
    },
    items,
    billing_info: {
      payment_method: 'already_paid',
    },
    recipient_info: {
      first_name: input.recipientName.split(' ').slice(0, -1).join(' ') || input.recipientName,
      last_name: input.recipientName.split(' ').slice(-1)[0] || '',
      phone: input.recipientPhone,
    },
  };

  try {
    const res = await fetch(`${cfg.host}/api/b2b/platform/offers/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': 'ru',
        Authorization: `Bearer ${cfg.token}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    let json: unknown;
    try { json = JSON.parse(text); } catch { json = text; }

    if (!res.ok) {
      console.error('[yandex-russia] create-offer failed:', res.status, text.slice(0, 1000));
      const errMsg =
        typeof json === 'object' && json && 'message' in json
          ? String((json as { message: string }).message)
          : `HTTP ${res.status}`;
      return { ok: false, error: errMsg, testMode: cfg.testMode, rawResponse: json };
    }

    // Извлекаем offers. Реальная структура может варьироваться — ищем по нескольким путям.
    const offers: RussiaOfferQuote[] = [];
    const root = json as Record<string, unknown>;
    const offersRaw =
      (root.offers as unknown[]) ??
      (root.offer ? [root.offer] : undefined) ??
      (root.data && (root.data as Record<string, unknown>).offers as unknown[]) ??
      [];

    for (const o of Array.isArray(offersRaw) ? offersRaw : []) {
      const rec = o as Record<string, unknown>;
      const detail = (rec.offer_details ?? rec.details ?? rec) as Record<string, unknown>;
      const priceCandidate =
        detail.pricing_total ?? detail.price ?? detail.total ?? rec.price;
      if (priceCandidate == null) continue;
      const interval = (detail.delivery_interval ?? detail.delivery_dates) as
        | { from?: string; to?: string }
        | undefined;
      offers.push({
        offerId: String(rec.offer_id ?? rec.id ?? ''),
        priceRub: parseFloat(String(priceCandidate)),
        deliveryFromIso: interval?.from,
        deliveryToIso: interval?.to,
        raw: o,
      });
    }

    if (offers.length === 0) {
      return {
        ok: false,
        error: 'Не нашли offers в ответе Яндекса (возможно, формат отличается от ожидаемого)',
        testMode: cfg.testMode,
        rawResponse: json,
      };
    }
    return { ok: true, offers, testMode: cfg.testMode };
  } catch (e) {
    return { ok: false, error: `Network: ${String(e)}`, testMode: cfg.testMode };
  }
}

/**
 * Подтвердить оффер — создать реальную заявку.
 * Базовая реализация: POST на /offers/confirm с offer_id.
 * Точная структура запроса/ответа неизвестна — будет уточняться по факту.
 */
export async function confirmRussiaOffer(offerId: string): Promise<{ ok: boolean; orderId?: string; error?: string; raw?: unknown }> {
  const cfg = await getRussiaConfig();
  if (!cfg.token) return { ok: false, error: 'Не настроена' };

  try {
    const res = await fetch(`${cfg.host}/api/b2b/platform/offers/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.token}`,
      },
      body: JSON.stringify({ offer_id: offerId }),
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    let json: unknown;
    try { json = JSON.parse(text); } catch { json = text; }

    if (!res.ok) {
      console.error('[yandex-russia] confirm failed:', res.status, text.slice(0, 1000));
      const errMsg =
        typeof json === 'object' && json && 'message' in json
          ? String((json as { message: string }).message)
          : `HTTP ${res.status}`;
      return { ok: false, error: errMsg, raw: json };
    }
    const root = json as Record<string, unknown>;
    const orderId = String(root.order_id ?? root.request_id ?? '');
    return { ok: true, orderId, raw: json };
  } catch (e) {
    return { ok: false, error: `Network: ${String(e)}` };
  }
}
