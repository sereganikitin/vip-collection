// Клиент Yandex Cargo B2B API (Я.Доставка).
// Docs: https://yandex.ru/dev/delivery-3-0/doc/dg/
//
// Endpoints v2:
//   POST /b2b/cargo/integration/v2/check-price           — оценка стоимости
//   POST /b2b/cargo/integration/v2/claims/create         — создание заявки
//   POST /b2b/cargo/integration/v2/claims/info           — статус
//   POST /b2b/cargo/integration/v2/claims/cancel         — отмена
//
// Авторизация: OAuth-токен из ЛК Я.Доставки → заголовок Authorization: Bearer.
// Геокодирование адресов — отдельный HTTPS-запрос к geocode-maps.yandex.ru
// с ключом Geocoder API (бесплатный, 25k запросов/сутки).

import { prisma } from '@/lib/prisma';
import { resolveItemDims, type ItemDims } from './delivery-defaults';

const CARGO_BASE = 'https://b2b.taxi.yandex.net/b2b/cargo/integration/v2';
const GEOCODER_BASE = 'https://geocode-maps.yandex.ru/1.x/';

// ──────────────────────────────────────────────────────────────
// Конфигурация (читаем из БД-настроек)
// ──────────────────────────────────────────────────────────────

export interface YandexDeliveryConfig {
  cargoToken: string;
  geocoderKey: string;
  // Адрес и координаты точки забора (склад)
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  pickupContactName: string;
  pickupContactPhone: string;
}

async function getConfig(): Promise<YandexDeliveryConfig | null> {
  const rows = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          'yd_token',
          'yd_geocoder_key',
          'yd_pickup_address',
          'yd_pickup_lat',
          'yd_pickup_lng',
          'yd_pickup_contact_name',
          'yd_pickup_contact_phone',
        ],
      },
    },
  });
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const cargoToken = (byKey.get('yd_token') ?? '').trim();
  const geocoderKey = (byKey.get('yd_geocoder_key') ?? '').trim();
  if (!cargoToken || !geocoderKey) return null;
  return {
    cargoToken,
    geocoderKey,
    pickupAddress: (byKey.get('yd_pickup_address') ?? '115088, Москва, Сормовский проезд, 11, стр. 1').trim(),
    pickupLat: parseFloat(byKey.get('yd_pickup_lat') ?? '55.708'),
    pickupLng: parseFloat(byKey.get('yd_pickup_lng') ?? '37.6906'),
    pickupContactName: (byKey.get('yd_pickup_contact_name') ?? 'VIP COLLECTION').trim(),
    pickupContactPhone: (byKey.get('yd_pickup_contact_phone') ?? '+79257437135').trim(),
  };
}

// ──────────────────────────────────────────────────────────────
// Геокодирование адреса
// ──────────────────────────────────────────────────────────────

export interface GeocodeResult {
  fullname: string;
  lat: number;
  lng: number;
}

export interface GeocodeOutcome {
  ok: boolean;
  result?: GeocodeResult;
  error?: string;        // короткая причина для UI
  details?: string;      // расширенная диагностика для логов
  triedAddress?: string; // что отправлено в Яндекс — может отличаться от input
}

/**
 * Геокодирование одной попыткой к Яндекс Геокодеру.
 * Возвращает структурированный результат с понятной причиной отказа:
 *   - 'Неверный ключ Геокодера' — HTTP 403
 *   - 'Адрес не распознан' — пустой featureMember
 *   - 'Сеть/таймаут' — fetch threw
 */
async function geocodeOnce(address: string, geocoderKey: string): Promise<GeocodeOutcome> {
  const url = new URL(GEOCODER_BASE);
  url.searchParams.set('apikey', geocoderKey);
  url.searchParams.set('geocode', address);
  url.searchParams.set('format', 'json');
  url.searchParams.set('lang', 'ru_RU');
  url.searchParams.set('results', '1');

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      const errShort =
        res.status === 403
          ? 'Неверный или неактивный ключ Геокодера'
          : res.status === 429
            ? 'Превышен лимит запросов к Геокодеру'
            : `Геокодер вернул HTTP ${res.status}`;
      return {
        ok: false,
        error: errShort,
        details: `HTTP ${res.status}: ${bodyText.slice(0, 300)}`,
        triedAddress: address,
      };
    }
    type GeocoderResp = {
      response?: {
        GeoObjectCollection?: {
          featureMember?: Array<{
            GeoObject?: {
              Point?: { pos?: string };
              metaDataProperty?: {
                GeocoderMetaData?: { text?: string };
              };
            };
          }>;
        };
      };
    };
    const data: GeocoderResp = await res.json();
    const feature = data.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
    const pos = feature?.Point?.pos; // "lng lat"
    const text = feature?.metaDataProperty?.GeocoderMetaData?.text;
    if (!pos) {
      return { ok: false, error: 'Адрес не распознан', triedAddress: address };
    }
    const [lng, lat] = pos.split(' ').map(parseFloat);
    if (Number.isNaN(lng) || Number.isNaN(lat)) {
      return { ok: false, error: 'Адрес не распознан', triedAddress: address };
    }
    return { ok: true, result: { fullname: text ?? address, lat, lng }, triedAddress: address };
  } catch (e) {
    return {
      ok: false,
      error: 'Сеть/таймаут к Геокодеру',
      details: String(e),
      triedAddress: address,
    };
  }
}

/**
 * Геокодирование с retry: если адрес не распознан и в нём нет города,
 * автоматически пробуем добавить «Москва, » в начало. Покрывает 90%
 * сценариев, когда покупатель вводит адрес без города.
 */
export async function geocode(address: string, geocoderKey: string): Promise<GeocodeOutcome> {
  const trimmed = address.trim();
  if (!trimmed) return { ok: false, error: 'Пустой адрес' };

  const first = await geocodeOnce(trimmed, geocoderKey);
  if (first.ok) return first;

  // Если адрес «не распознан» и в нём нет крупного города — пробуем с префиксом
  const hasCity = /Москв|Подмоско|Россия|область|г\.\s|город /i.test(trimmed);
  if (first.error === 'Адрес не распознан' && !hasCity) {
    const withCity = `Москва, ${trimmed}`;
    const retry = await geocodeOnce(withCity, geocoderKey);
    if (retry.ok) return retry;
    // отдадим из retry — в нём более информативная попытка
    return { ...retry, details: `Тоже не нашёл с префиксом «Москва»: ${retry.error}` };
  }

  return first;
}

// ──────────────────────────────────────────────────────────────
// Формирование cargo items из заказа
// ──────────────────────────────────────────────────────────────

export interface OrderItemForCargo {
  name: string;
  quantity: number;
  price: number;
  categoryId: string;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  weight?: number | null;
}

interface CargoItem {
  title: string;
  quantity: number;
  size: { length: number; width: number; height: number }; // в метрах
  weight: number; // кг
  cost_currency: 'RUB';
  cost_value: string;
}

function toCargoItems(items: OrderItemForCargo[]): { cargoItems: CargoItem[]; totalDims: ItemDims } {
  const cargoItems: CargoItem[] = [];
  // Совокупные габариты для check-price — используем максимум и сумму
  let maxL = 0, maxW = 0, maxH = 0, totalKg = 0;

  for (const it of items) {
    const dims = resolveItemDims(it.categoryId, {
      length: it.length ?? undefined,
      width:  it.width ?? undefined,
      height: it.height ?? undefined,
      weight: it.weight ?? undefined,
    });
    cargoItems.push({
      title: it.name.slice(0, 200),
      quantity: it.quantity,
      size: {
        length: round(dims.length / 100, 3),
        width:  round(dims.width / 100, 3),
        height: round(dims.height / 100, 3),
      },
      weight: round(dims.weight, 3),
      cost_currency: 'RUB',
      cost_value: String(Math.round(it.price)),
    });
    maxL = Math.max(maxL, dims.length);
    maxW = Math.max(maxW, dims.width);
    maxH = Math.max(maxH, dims.height);
    totalKg += dims.weight * it.quantity;
  }

  return {
    cargoItems,
    totalDims: { length: maxL, width: maxW, height: maxH, weight: Math.max(totalKg, 0.1) },
  };
}

function round(n: number, decimals: number) {
  const m = Math.pow(10, decimals);
  return Math.round(n * m) / m;
}

// ──────────────────────────────────────────────────────────────
// Check price — оценка стоимости
// ──────────────────────────────────────────────────────────────

export interface PriceQuote {
  tariff: string;       // courier / express / cargo / intercity
  priceRub: number;     // итоговая цена
  etaMinutes?: number;  // время от заказа до доставки (если есть)
  zoneType?: string;    // urban / interurban — индикатор Москва / межгород
}

export interface CheckPriceInput {
  destinationAddress: string;
  destinationLat?: number;
  destinationLng?: number;
  items: OrderItemForCargo[];
}

export interface CheckPriceResult {
  ok: boolean;
  error?: string;
  quotes?: PriceQuote[];
  destination?: GeocodeResult;
}

export async function checkPrice(input: CheckPriceInput): Promise<CheckPriceResult> {
  const cfg = await getConfig();
  if (!cfg) return { ok: false, error: 'Я.Доставка не настроена в админке (нет токена или ключа геокодера).' };

  // Геокодируем адрес назначения, если координаты не пришли
  let dest: GeocodeResult;
  if (input.destinationLat && input.destinationLng) {
    dest = { fullname: input.destinationAddress, lat: input.destinationLat, lng: input.destinationLng };
  } else {
    const g = await geocode(input.destinationAddress, cfg.geocoderKey);
    if (!g.ok || !g.result) {
      const tried = g.triedAddress ? ` (пробовали: «${g.triedAddress}»)` : '';
      return { ok: false, error: `Геокодер: ${g.error}${tried}` };
    }
    dest = g.result;
  }

  const { cargoItems } = toCargoItems(input.items);

  const body = {
    items: cargoItems,
    route_points: [
      {
        coordinates: [cfg.pickupLng, cfg.pickupLat],
        fullname: cfg.pickupAddress,
      },
      {
        coordinates: [dest.lng, dest.lat],
        fullname: dest.fullname,
      },
    ],
  };

  try {
    const res = await fetch(`${CARGO_BASE}/check-price`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': 'ru',
        Authorization: `Bearer ${cfg.cargoToken}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const json = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        error: `Я.Доставка: ${json?.message ?? json?.code ?? res.statusText}`,
        destination: dest,
      };
    }

    // Ответ check-price: { price: string, eta: number, distance_meters: ..., zone_type: ... }
    // Тарифные опции иногда в offers/tariff_options — структура зависит от версии.
    const quotes: PriceQuote[] = [];
    if (typeof json.price === 'string') {
      quotes.push({
        tariff: json.tariff ?? json.requirements?.taxi_class ?? 'courier',
        priceRub: parseFloat(json.price),
        etaMinutes: json.eta,
        zoneType: json.zone_type,
      });
    }
    if (Array.isArray(json.offers)) {
      for (const o of json.offers) {
        quotes.push({
          tariff: o.tariff_name ?? o.taxi_class ?? 'courier',
          priceRub: parseFloat(o.price ?? '0'),
          etaMinutes: o.eta,
          zoneType: o.zone_type,
        });
      }
    }

    if (quotes.length === 0) {
      return { ok: false, error: 'Я.Доставка вернула пустой список тарифов', destination: dest };
    }
    return { ok: true, quotes, destination: dest };
  } catch (e) {
    return { ok: false, error: `Network: ${String(e)}`, destination: dest };
  }
}

// ──────────────────────────────────────────────────────────────
// Create claim — создание заявки
// ──────────────────────────────────────────────────────────────

export interface CreateClaimInput {
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  destinationAddress: string;
  destinationLat?: number;
  destinationLng?: number;
  items: OrderItemForCargo[];
  taxiClass?: string; // courier / express / cargo
  comment?: string;
}

export interface CreateClaimResult {
  ok: boolean;
  error?: string;
  claimId?: string;
  status?: string;
  price?: number;
  eta?: string;
  trackingUrl?: string;
}

export async function createClaim(input: CreateClaimInput): Promise<CreateClaimResult> {
  const cfg = await getConfig();
  if (!cfg) return { ok: false, error: 'Я.Доставка не настроена' };

  // Геокодирование назначения
  let dest: GeocodeResult;
  if (input.destinationLat && input.destinationLng) {
    dest = { fullname: input.destinationAddress, lat: input.destinationLat, lng: input.destinationLng };
  } else {
    const g = await geocode(input.destinationAddress, cfg.geocoderKey);
    if (!g.ok || !g.result) {
      const tried = g.triedAddress ? ` (пробовали: «${g.triedAddress}»)` : '';
      return { ok: false, error: `Геокодер: ${g.error}${tried}` };
    }
    dest = g.result;
  }

  const { cargoItems } = toCargoItems(input.items);

  const body = {
    items: cargoItems,
    route_points: [
      {
        point_id: 1,
        visit_order: 1,
        type: 'source',
        address: {
          fullname: cfg.pickupAddress,
          coordinates: [cfg.pickupLng, cfg.pickupLat],
        },
        contact: {
          name: cfg.pickupContactName,
          phone: cfg.pickupContactPhone,
        },
      },
      {
        point_id: 2,
        visit_order: 2,
        type: 'destination',
        address: {
          fullname: dest.fullname,
          coordinates: [dest.lng, dest.lat],
        },
        contact: {
          name: input.customerName,
          phone: input.customerPhone,
        },
      },
    ],
    emergency_contact: {
      name: cfg.pickupContactName,
      phone: cfg.pickupContactPhone,
    },
    skip_door_to_door: false,
    skip_client_notify: false,
    skip_emergency_notify: false,
    optional_return: true,
    ...(input.taxiClass ? { taxi_class: input.taxiClass } : {}),
    ...(input.comment ? { comment: input.comment.slice(0, 1000) } : {}),
    client_requirements: input.taxiClass ? { taxi_class: input.taxiClass } : undefined,
  };

  const requestId = `vip-coll-${input.orderNumber}-${Date.now()}`;

  try {
    const res = await fetch(`${CARGO_BASE}/claims/create?request_id=${requestId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': 'ru',
        Authorization: `Bearer ${cfg.cargoToken}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    const json = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        error: `Я.Доставка create: ${json?.message ?? json?.code ?? res.statusText}`,
      };
    }
    return {
      ok: true,
      claimId: json.id,
      status: json.status,
      price: json.pricing?.offer?.price ? parseFloat(json.pricing.offer.price) : undefined,
      eta: json.eta,
      trackingUrl: json.route_points?.[1]?.external_order_id
        ? `https://dostavka.yandex.ru/ru_ru/order/${json.id}`
        : `https://dostavka.yandex.ru/ru_ru/order/${json.id}`,
    };
  } catch (e) {
    return { ok: false, error: `Network: ${String(e)}` };
  }
}

// ──────────────────────────────────────────────────────────────
// Get claim status
// ──────────────────────────────────────────────────────────────

export async function getClaimInfo(claimId: string): Promise<{ ok: boolean; status?: string; error?: string }> {
  const cfg = await getConfig();
  if (!cfg) return { ok: false, error: 'Я.Доставка не настроена' };

  try {
    const res = await fetch(`${CARGO_BASE}/claims/info?claim_id=${claimId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': 'ru',
        Authorization: `Bearer ${cfg.cargoToken}`,
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json?.message ?? res.statusText };
    return { ok: true, status: json.status };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ──────────────────────────────────────────────────────────────
// Cancel claim
// ──────────────────────────────────────────────────────────────

export async function cancelClaim(claimId: string, version = 1): Promise<{ ok: boolean; error?: string }> {
  const cfg = await getConfig();
  if (!cfg) return { ok: false, error: 'Я.Доставка не настроена' };

  try {
    const res = await fetch(`${CARGO_BASE}/claims/cancel?claim_id=${claimId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': 'ru',
        Authorization: `Bearer ${cfg.cargoToken}`,
      },
      body: JSON.stringify({ cancel_state: 'free', version }),
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json?.message ?? res.statusText };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
