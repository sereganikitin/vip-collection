// Клиент Я.Доставка Platform API (b2b.taxi.yandex.net/api/b2b/platform/...).
//
// Это отдельный сервис от Cargo. Для одного и того же y0_-токена Яндекс
// активирует один из продуктов (Cargo или Platform), и они не пересекаются.
// На текущем аккаунте активен Platform — это подтверждено эмпирически:
// Cargo возвращает 409 suitable_offer_not_found, Platform даёт офферы.
//
// Эндпоинты:
//   POST /api/b2b/platform/pickup-points/list  — список ПВЗ по geo_id
//   POST /api/b2b/platform/offers/create        — расчёт стоимости + сроки
//   POST /api/b2b/platform/offers/confirm       — подтверждение оффера → заказ
//   POST /api/b2b/platform/orders/info          — статус заказа (пока не используем)
//
// Авторизация: Bearer <y0_…> из настроек (yd_russia_token).
// Source platform_id — ваша станция-источник из вашего ЛК Я.Доставки,
// настраивается в /admin/settings (yd_russia_station_id). Дефолта нет:
// если поле пустое, расчёт вернёт ошибку, чтобы случайно не уйти на
// чужую станцию (Platform отдаст 403 access denied).

import { prisma } from '@/lib/prisma';
import { resolveItemDims } from './delivery-defaults';
import type { OrderItemForCargo } from './yandex-delivery';

const HOST = 'https://b2b.taxi.yandex.net';

// Статусы из публичной документации Я.Доставки Platform.
export const RUSSIA_STATUS_LABELS: Record<string, string> = {
  DRAFT:                            'Черновик',
  CREATED:                          'Заказ создан и подтверждён',
  SORTING_CENTER_AT_START:          'В точке приёма',
  DELIVERY_DELIVERED:               'Доставлен клиенту',
  PARTICULARLY_DELIVERED:           'Частично доставлен',
  CANCELLED:                        'Отменён',
  RETURN_PREPARING:                 'Готовится возврат',
  RETURN_TRANSPORTATION_STARTED:    'Возврат в пути',
  RETURN_ARRIVED_DELIVERY:          'Возврат на складе',
  RETURN_TRANSMITTED_FULFILMENT:    'Передан на единый склад',
  RETURN_READY_FOR_PICKUP:          'Готов к передаче магазину',
  RETURN_RETURNED:                  'Возвращён в магазин',
};

export function russiaStatusLabel(s: string | null | undefined): string {
  if (!s) return '—';
  return RUSSIA_STATUS_LABELS[s] ?? s;
}

// ──────────────────────────────────────────────────────────────
// Конфигурация
// ──────────────────────────────────────────────────────────────

interface RussiaConfig {
  host: string;
  token: string;
  sourceStationId: string;
}

async function getRussiaConfig(): Promise<RussiaConfig | null> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ['yd_russia_token', 'yd_russia_station_id'] } },
  });
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const token = (byKey.get('yd_russia_token') ?? '').trim();
  const sourceStationId = (byKey.get('yd_russia_station_id') ?? '').trim();
  if (!token || !sourceStationId) return null;
  return { host: HOST, token, sourceStationId };
}

// ──────────────────────────────────────────────────────────────
// Pickup Points (список ПВЗ для выбора получателю)
// ──────────────────────────────────────────────────────────────

export interface PickupPoint {
  id: string;          // platform_id
  name?: string;
  address: string;
  workingHours?: string;
  /** Координаты для отображения на карте. null если Яндекс их не прислал. */
  lat?: number;
  lng?: number;
  raw: unknown;
}

/**
 * Достаём координаты ПВЗ из ответа. Platform отдаёт их в разных формах
 * в зависимости от партнёра-перевозчика, поэтому пробуем несколько путей.
 */
function extractCoords(raw: Record<string, unknown>): { lat?: number; lng?: number } {
  const candidates: Array<unknown> = [
    raw.position,
    raw.point,
    raw.coordinates,
    raw.location,
    (raw.address as Record<string, unknown> | undefined)?.position,
    (raw.address as Record<string, unknown> | undefined)?.point,
    raw.geopoint,
  ];
  for (const c of candidates) {
    if (!c) continue;
    // Объект {lat, lon|lng}
    if (typeof c === 'object' && !Array.isArray(c)) {
      const o = c as Record<string, unknown>;
      const lat = typeof o.lat === 'number' ? o.lat : (typeof o.latitude === 'number' ? o.latitude : undefined);
      const lng = typeof o.lon === 'number' ? o.lon : (typeof o.lng === 'number' ? o.lng : (typeof o.longitude === 'number' ? o.longitude : undefined));
      if (typeof lat === 'number' && typeof lng === 'number') return { lat, lng };
    }
    // Массив [lon, lat] (как в GeoJSON)
    if (Array.isArray(c) && c.length === 2 && typeof c[0] === 'number' && typeof c[1] === 'number') {
      return { lat: c[1], lng: c[0] };
    }
  }
  return {};
}

export interface PickupPointsResult {
  ok: boolean;
  error?: string;
  points?: PickupPoint[];
}

function extractAddress(raw: Record<string, unknown>): string {
  const addr = raw.address;
  if (typeof addr === 'string') return addr;
  if (addr && typeof addr === 'object') {
    const a = addr as Record<string, unknown>;
    return (a.full_address as string) ?? (a.address_string as string) ?? (a.comment as string) ?? '';
  }
  return (raw.full_address as string) ?? '';
}

const DAY_NAMES = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

/**
 * Превращает список номеров дней (1=Пн … 7=Вс) в человекочитаемую строку:
 *   [1,2,3,4,5]       → "Пн-Пт"
 *   [1,2,3,4,5,6,7]   → "Ежедневно"
 *   [6,7]             → "Сб-Вс"
 *   [1,3,5]           → "Пн, Ср, Пт"
 *   [1,2,3,4,5,7]     → "Пн-Пт, Вс"
 */
function formatDayList(days: number[]): string {
  const sorted = [...new Set(days)].filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b);
  if (sorted.length === 0) return '';
  if (sorted.length === 7) return 'Ежедневно';
  // Группируем последовательные дни в диапазоны
  const ranges: number[][] = [];
  let cur: number[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      cur.push(sorted[i]);
    } else {
      ranges.push(cur);
      cur = [sorted[i]];
    }
  }
  ranges.push(cur);
  return ranges
    .map((r) => (r.length <= 2
      ? r.map((d) => DAY_NAMES[d]).join(', ')
      : `${DAY_NAMES[r[0]]}-${DAY_NAMES[r[r.length - 1]]}`))
    .join(', ');
}

function extractWorkingHours(raw: Record<string, unknown>): string | undefined {
  const sched = raw.schedule;
  if (!sched || typeof sched !== 'object') return undefined;
  const s = sched as Record<string, unknown>;
  // Если у Яндекса уже готовое человекочитаемое описание — берём его как есть
  if (typeof s.restrictions_text === 'string' && s.restrictions_text.trim()) {
    return s.restrictions_text;
  }
  const restr = s.restrictions;
  if (!Array.isArray(restr)) return undefined;

  // Группируем дни по часам, чтобы все 9-21 шли как «Пн-Вс 9-21»
  // вместо «1 9-21, 2 9-21, …». Формат restriction:
  //   { days: [1,2,3], time_from: { hours: 9 }, time_to: { hours: 21 } }
  type Bucket = { from: number; to: number; days: number[] };
  const buckets = new Map<string, Bucket>();

  for (const r of restr) {
    const rec = r as Record<string, unknown>;
    const daysRaw = rec.days;
    if (!Array.isArray(daysRaw)) continue;
    const days = daysRaw.map((d) => Number(d)).filter((d) => Number.isInteger(d));
    const tFrom = (rec.time_from as Record<string, unknown> | undefined)?.hours;
    const tTo = (rec.time_to as Record<string, unknown> | undefined)?.hours;
    if (typeof tFrom !== 'number' || typeof tTo !== 'number') continue;
    const key = `${tFrom}-${tTo}`;
    if (!buckets.has(key)) buckets.set(key, { from: tFrom, to: tTo, days: [] });
    buckets.get(key)!.days.push(...days);
  }

  if (buckets.size === 0) return undefined;

  const parts: string[] = [];
  for (const b of buckets.values()) {
    const dayStr = formatDayList(b.days);
    if (!dayStr) continue;
    // Часы в формате «9-21». Если from=0 и to=24 — это круглосуточно.
    if (b.from === 0 && b.to === 24) parts.push(`${dayStr} круглосуточно`);
    else parts.push(`${dayStr} с ${b.from} до ${b.to}`);
  }
  return parts.join(', ');
}

export async function listPickupPoints(geoId: number): Promise<PickupPointsResult> {
  const cfg = await getRussiaConfig();
  if (!cfg) return { ok: false, error: 'Я.Доставка не настроена. Заполните токен (y0_…) и platform_station_id в /admin/settings.' };

  try {
    const res = await fetch(`${cfg.host}/api/b2b/platform/pickup-points/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': 'ru',
        Authorization: `Bearer ${cfg.token}`,
      },
      body: JSON.stringify({ available_for_dropoff: true, geo_id: geoId }),
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    let json: unknown;
    try { json = JSON.parse(text); } catch { json = text; }

    if (!res.ok) {
      console.error('[yandex-russia] pickup-points failed:', res.status, text.slice(0, 500));
      const errMsg =
        typeof json === 'object' && json && 'message' in json
          ? String((json as { message: string }).message)
          : `HTTP ${res.status}`;
      return { ok: false, error: errMsg };
    }

    const root = json as Record<string, unknown>;
    const list = (root.points ?? root.pickup_points ?? root.items ?? []) as unknown[];

    const points: PickupPoint[] = (Array.isArray(list) ? list : [])
      .map((p) => {
        const r = p as Record<string, unknown>;
        const coords = extractCoords(r);
        return {
          id: String(r.id ?? r.platform_id ?? ''),
          name: (r.name as string) ?? undefined,
          address: extractAddress(r),
          workingHours: extractWorkingHours(r),
          lat: coords.lat,
          lng: coords.lng,
          raw: p,
        };
      })
      .filter((p) => p.id);

    return { ok: true, points };
  } catch (e) {
    return { ok: false, error: `Network: ${String(e)}` };
  }
}

// ──────────────────────────────────────────────────────────────
// Offers: расчёт стоимости и подтверждение
// ──────────────────────────────────────────────────────────────

export type DeliveryMode = 'pickup' | 'door';

export interface OfferDestination {
  mode: DeliveryMode;
  /** Для mode=pickup: platform_id ПВЗ получателя (из listPickupPoints). */
  destPlatformId?: string;
  /** Для mode=door: полный адрес получателя. */
  destAddress?: string;
  /** Для mode=door: город (используется как locality в custom_location). */
  destLocality?: string;
  /** Для mode=door (опционально): координаты. */
  destGeopoint?: { lat: number; lng: number };
}

export interface RussiaOfferInput {
  destination: OfferDestination;
  items: OrderItemForCargo[];
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
}

export interface RussiaOfferQuote {
  offerId: string;
  priceRub: number;
  deliveryFromIso?: string;
  deliveryToIso?: string;
  /** Имя перевозчика / тарифа, если Яндекс его прислал (СДЭК, Boxberry и т.п.) */
  partner?: string;
  raw?: unknown;
}

export interface RussiaOfferResult {
  ok: boolean;
  error?: string;
  offers?: RussiaOfferQuote[];
  rawResponse?: unknown;
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Достаёт интервал доставки из оффера Яндекса. Platform возвращает разные
 * структуры в зависимости от тарифа/партнёра, поэтому пробуем несколько путей.
 */
function extractInterval(rec: Record<string, unknown>): { from?: string; to?: string } {
  const detail = (rec.offer_details ?? rec.details ?? rec) as Record<string, unknown>;
  const sources: Array<Record<string, unknown> | undefined> = [
    detail.delivery_interval as Record<string, unknown> | undefined,
    detail.delivery_dates as Record<string, unknown> | undefined,
    detail.pickup_interval as Record<string, unknown> | undefined,
    detail.delivery_time as Record<string, unknown> | undefined,
    rec.delivery_interval as Record<string, unknown> | undefined,
    rec.delivery_dates as Record<string, unknown> | undefined,
  ];
  const fromKeys = ['from', 'delivery_from', 'date_from', 'pickup_date', 'pickup_dt', 'min_date', 'start'];
  const toKeys   = ['to',   'delivery_to',   'date_to',   'date_drop_off', 'max_date', 'end'];
  for (const src of sources) {
    if (!src) continue;
    let from: string | undefined;
    let to: string | undefined;
    for (const k of fromKeys) if (typeof src[k] === 'string') { from = src[k] as string; break; }
    for (const k of toKeys)   if (typeof src[k] === 'string') { to = src[k] as string; break; }
    if (from || to) return { from, to };
  }
  return {};
}

/** Имя перевозчика / тарифа — пробуем разные поля. */
function extractPartner(rec: Record<string, unknown>): string | undefined {
  const detail = (rec.offer_details ?? rec.details ?? rec) as Record<string, unknown>;
  const candidates: unknown[] = [
    detail.delivery_partner, detail.partner_name, detail.last_mile_partner,
    detail.tariff_name, detail.delivery_method_name, detail.delivery_provider,
    rec.partner, rec.partner_name, rec.delivery_partner,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c) return c;
    if (c && typeof c === 'object') {
      const obj = c as Record<string, unknown>;
      if (typeof obj.name === 'string') return obj.name;
      if (typeof obj.title === 'string') return obj.title;
      if (typeof obj.display_name === 'string') return obj.display_name;
    }
  }
  return undefined;
}

function splitName(fullname: string): { first: string; last: string } {
  const parts = fullname.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: 'Покупатель', last: 'Без фамилии' };
  if (parts.length === 1) return { first: parts[0], last: 'Без фамилии' };
  // Принимаем формат «Фамилия Имя [Отчество]» (типично в РФ-формах).
  return { first: parts.slice(1).join(' '), last: parts[0] };
}

export async function createRussiaOffer(input: RussiaOfferInput): Promise<RussiaOfferResult> {
  const cfg = await getRussiaConfig();
  if (!cfg) return { ok: false, error: 'Я.Доставка не настроена. Заполните токен (y0_…) и platform_station_id в /admin/settings.' };

  // Габариты и цены.
  let totalWeightGr = 0;
  let maxL = 0, maxW = 0, maxH = 0;
  const items = input.items.map((it) => {
    const dims = resolveItemDims(it.categoryId, {
      length: it.length ?? undefined,
      width:  it.width ?? undefined,
      height: it.height ?? undefined,
      weight: it.weight ?? undefined,
    });
    const itemWeightGr = Math.round(dims.weight * 1000);
    totalWeightGr += itemWeightGr * it.quantity;
    maxL = Math.max(maxL, dims.length);
    maxW = Math.max(maxW, dims.width);
    maxH = Math.max(maxH, dims.height);
    const priceKop = Math.round(it.price * 100);
    return {
      count: it.quantity,
      name: it.name.slice(0, 200),
      article: '',
      billing_details: {
        unit_price: priceKop,
        assessed_unit_price: priceKop,
        nds: -1, // -1 = без НДС
      },
      physical_dims: {
        weight_gross: Math.max(itemWeightGr, 100),
        dx: Math.round(dims.length),
        dy: Math.round(dims.width),
        dz: Math.round(dims.height),
      },
      place_barcode: 'P1',
    };
  });

  const places = [
    {
      physical_dims: {
        weight_gross: Math.max(totalWeightGr, 100),
        dx: Math.round(maxL),
        dy: Math.round(maxW),
        dz: Math.round(maxH),
      },
      barcode: 'P1',
    },
  ];

  // destination + last_mile_policy по режиму.
  let destination: Record<string, unknown>;
  let lastMilePolicy: string;

  if (input.destination.mode === 'pickup') {
    if (!input.destination.destPlatformId) {
      return { ok: false, error: 'Не указан ПВЗ-получатель' };
    }
    destination = {
      type: 'platform_station',
      platform_station: { platform_id: input.destination.destPlatformId },
    };
    lastMilePolicy = 'self_pickup';
  } else {
    if (!input.destination.destAddress) {
      return { ok: false, error: 'Не указан адрес доставки' };
    }
    destination = {
      type: 'custom_location',
      custom_location: {
        details: {
          full_address: input.destination.destAddress,
          ...(input.destination.destLocality ? { locality: input.destination.destLocality } : {}),
          ...(input.destination.destGeopoint
            ? { geopoint: [input.destination.destGeopoint.lng, input.destination.destGeopoint.lat] }
            : {}),
        },
      },
    };
    // ВНИМАНИЕ: значение last_mile_policy для двери не проверено эмпирически.
    // 'time_interval' — лучшая догадка на основе документации Platform.
    // Если Яндекс ругнётся — заменим на правильное (например, 'courier_delivery').
    lastMilePolicy = 'time_interval';
  }

  const { first, last } = splitName(input.recipientName);

  const body = {
    info: { operator_request_id: uuid() },
    source: {
      platform_station: { platform_id: cfg.sourceStationId },
    },
    destination,
    items,
    places,
    billing_info: { payment_method: 'already_paid' },
    recipient_info: {
      first_name: first,
      last_name: last,
      phone: input.recipientPhone,
      ...(input.recipientEmail ? { email: input.recipientEmail } : {}),
    },
    last_mile_policy: lastMilePolicy,
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
      return { ok: false, error: errMsg, rawResponse: json };
    }

    const offers: RussiaOfferQuote[] = [];
    const root = json as Record<string, unknown>;
    const offersRaw =
      (root.offers as unknown[]) ??
      (root.offer ? [root.offer] : undefined) ??
      [];

    for (const o of Array.isArray(offersRaw) ? offersRaw : []) {
      const rec = o as Record<string, unknown>;
      const detail = (rec.offer_details ?? rec.details ?? rec) as Record<string, unknown>;
      const priceCandidate =
        detail.pricing_total ?? detail.price ?? detail.total ?? rec.price;
      if (priceCandidate == null) continue;
      const interval = extractInterval(rec);
      offers.push({
        offerId: String(rec.offer_id ?? rec.id ?? ''),
        priceRub: parseFloat(String(priceCandidate)),
        deliveryFromIso: interval.from,
        deliveryToIso: interval.to,
        partner: extractPartner(rec),
        raw: o,
      });
    }

    if (offers.length === 0) {
      return {
        ok: false,
        error: 'Не нашли offers в ответе Яндекса (формат изменился?)',
        rawResponse: json,
      };
    }
    return { ok: true, offers };
  } catch (e) {
    return { ok: false, error: `Network: ${String(e)}` };
  }
}

export interface ConfirmResult {
  ok: boolean;
  orderId?: string;
  trackingUrl?: string;
  error?: string;
  raw?: unknown;
}

export async function confirmRussiaOffer(offerId: string): Promise<ConfirmResult> {
  const cfg = await getRussiaConfig();
  if (!cfg) return { ok: false, error: 'Я.Доставка не настроена' };

  try {
    const res = await fetch(`${cfg.host}/api/b2b/platform/offers/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': 'ru',
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
    const orderId = String(root.order_id ?? root.request_id ?? root.id ?? '');
    const trackingUrl = (root.tracking_url as string) ?? undefined;
    return { ok: true, orderId, trackingUrl, raw: json };
  } catch (e) {
    return { ok: false, error: `Network: ${String(e)}` };
  }
}
