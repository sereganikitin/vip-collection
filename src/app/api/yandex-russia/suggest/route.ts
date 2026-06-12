// GET /api/yandex-russia/suggest?text=...&city=...
//
// Подсказки улиц для чекаута.
//
// Каскад источников:
//   1. Yandex Suggest API v1 (suggest-maps.yandex.ru/v1/suggest) —
//      настоящий автокомплит с префиксным совпадением. Требует apikey
//      с правом на Suggest/Places API. Если он у ключа есть — лучший
//      вариант: «Тучков» → «Тучковская улица» уже на 6 символах.
//   2. Yandex Geocoder kind=street — fallback, если у ключа нет
//      доступа к Suggest. Работает плохо для частичного ввода —
//      возвращает результат только при совпадении почти полного имени.
//   3. Nominatim — последний рубеж, если первые два промолчали.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface GeoSuggestion {
  street: string;
  full: string;
  house?: string;
  lat: number;
  lng: number;
  kind: string;
}

// ── Yandex Suggest API v1 (primary) ──────────────────────────

/**
 * Reach Yandex Suggest API. Возвращает [] на 403 (ключ не имеет
 * доступа к Suggest) или на любой другой ошибке — тогда упадём
 * на следующий уровень каскада.
 */
async function yandexSuggestV1(text: string, city: string, apiKey: string): Promise<GeoSuggestion[]> {
  const url = new URL('https://suggest-maps.yandex.ru/v1/suggest');
  url.searchParams.set('apikey', apiKey);
  url.searchParams.set('text', city ? `${city}, ${text}` : text);
  url.searchParams.set('lang', 'ru_RU');
  url.searchParams.set('results', '8');
  url.searchParams.set('print_address', '1');
  url.searchParams.set('attrs', 'uri'); // запрашиваем uri тоже
  url.searchParams.set('types', 'geo'); // только географические объекты, без бизнесов

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      // 403 = у ключа нет права на Suggest API
      if (res.status === 403) {
        console.warn('[suggest] Yandex Suggest 403 — у ключа yd_geocoder_key, видимо, нет прав на Suggest API. Включите Places/Suggest в кабинете developer.tech.yandex.ru.');
      }
      return [];
    }
    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];

    const seen = new Set<string>();
    const out: GeoSuggestion[] = [];
    for (const r of results) {
      const rec = r as Record<string, unknown>;
      const title = (rec.title as { text?: string } | undefined)?.text ?? '';
      const subtitle = (rec.subtitle as { text?: string } | undefined)?.text ?? '';
      const addr = (rec.address as { formatted_address?: string } | undefined)?.formatted_address ?? '';
      const tags = (rec.tags as string[]) ?? [];
      // Координаты приходят в distance/position или в самом объекте — пробуем разные пути.
      const pos =
        (rec.position as { lat?: number; lon?: number } | undefined) ??
        (rec.point as { lat?: number; lon?: number } | undefined);
      const lat = pos?.lat ?? 0;
      const lng = pos?.lon ?? 0;

      // Принимаем только улицы/дома. POI/районы выкидываем.
      const isStreetish =
        tags.includes('street') ||
        tags.includes('house') ||
        tags.includes('address') ||
        // эвристика на случай отсутствия тегов
        /улиц[аы]|проспект|переулок|шоссе|бульвар|набережная/i.test(title);
      if (!isStreetish) continue;
      if (!title) continue;

      const dedupKey = `${title}::${subtitle}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      // full = title + subtitle, или formatted_address
      const full = addr || (subtitle ? `${title}, ${subtitle}` : title);
      out.push({
        street: title,
        full,
        lat, lng,
        kind: 'street',
      });
    }
    return out;
  } catch {
    return [];
  }
}

// ── Yandex Geocoder kind=street (secondary) ──────────────────

async function yandexGeocoderStreet(text: string, city: string, apiKey: string): Promise<GeoSuggestion[]> {
  const url = new URL('https://geocode-maps.yandex.ru/1.x/');
  url.searchParams.set('apikey', apiKey);
  url.searchParams.set('geocode', city ? `${city}, ${text}` : text);
  url.searchParams.set('format', 'json');
  url.searchParams.set('lang', 'ru_RU');
  url.searchParams.set('results', '8');
  url.searchParams.set('kind', 'street');

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    const members =
      (data?.response?.GeoObjectCollection?.featureMember as Array<Record<string, unknown>>) ?? [];

    const seen = new Set<string>();
    const out: GeoSuggestion[] = [];
    for (const m of members) {
      const geo = (m.GeoObject ?? {}) as Record<string, unknown>;
      const pos = (geo.Point as Record<string, string> | undefined)?.pos ?? '';
      const [lngS, latS] = pos.split(' ');
      const lat = parseFloat(latS);
      const lng = parseFloat(lngS);
      if (Number.isNaN(lat) || Number.isNaN(lng)) continue;

      const meta =
        ((geo.metaDataProperty as Record<string, unknown>)?.GeocoderMetaData as Record<string, unknown>) ??
        {};
      const addr = (meta.Address as Record<string, unknown>) ?? {};
      const components = (addr.Components as Array<{ kind: string; name: string }>) ?? [];

      // Собираем имя улицы и города из компонент адреса
      let street = '';
      let cityResolved = '';
      for (const c of components) {
        if (c.kind === 'street' && !street) street = c.name;
        if ((c.kind === 'locality' || c.kind === 'area') && !cityResolved) cityResolved = c.name;
      }
      if (!street) {
        // Иногда улица в name самого GeoObject
        const name = (geo.name as string) ?? '';
        if (name && !/\d/.test(name)) street = name;
      }
      if (!street) continue;

      const dedupKey = `${street}::${cityResolved}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      const full = cityResolved ? `${street}, ${cityResolved}` : street;
      out.push({
        street,
        full,
        lat, lng,
        kind: 'street',
      });
    }
    return out;
  } catch {
    return [];
  }
}

// ── Nominatim (fallback) ─────────────────────────────────────

interface NominatimItem {
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  address?: {
    road?: string;
    house_number?: string;
    suburb?: string;
    city_district?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
  };
}

async function nominatimSuggest(text: string, city: string): Promise<GeoSuggestion[]> {
  const query = city ? `${city}, ${text}` : text;
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('accept-language', 'ru');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('countrycodes', 'ru');
  url.searchParams.set('limit', '8');

  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'vipcoll.ru-checkout/1.0 (vipshopp@yandex.ru)' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as NominatimItem[];

    const seen = new Set<string>();
    const out: GeoSuggestion[] = [];
    for (const d of Array.isArray(data) ? data : []) {
      const lat = parseFloat(d.lat);
      const lng = parseFloat(d.lon);
      if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
      const addr = d.address ?? {};
      const road = addr.road ?? '';
      const cityPart = addr.city ?? addr.town ?? addr.village ?? '';
      if (!road) continue;
      const dedupKey = `${road}::${cityPart}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
      const full = cityPart ? `${road}, ${cityPart}` : road;
      out.push({
        street: road,
        full,
        house: addr.house_number ?? undefined,
        lat, lng,
        kind: d.type ?? 'address',
      });
    }
    return out;
  } catch {
    return [];
  }
}

// ── Handler ─────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const text = (sp.get('text') ?? '').trim();
  const city = (sp.get('city') ?? '').trim();

  if (text.length < 2) {
    return NextResponse.json({ ok: true, suggestions: [] });
  }

  // Достаём ключ Геокодера/Сuggest API из настроек
  const row = await prisma.setting.findUnique({ where: { key: 'yd_geocoder_key' } });
  const apiKey = (row?.value ?? '').trim();

  let suggestions: GeoSuggestion[] = [];
  let source = 'none';

  // 1) Yandex Suggest API v1 — настоящий автокомплит
  if (apiKey) {
    suggestions = await yandexSuggestV1(text, city, apiKey);
    if (suggestions.length > 0) source = 'yandex-suggest';
  }

  // 2) Yandex Geocoder kind=street — для случая, если у ключа нет Suggest API
  if (suggestions.length === 0 && apiKey) {
    suggestions = await yandexGeocoderStreet(text, city, apiKey);
    if (suggestions.length > 0) source = 'yandex-geocoder';
  }

  // 3) Nominatim — последний фолбэк
  if (suggestions.length === 0) {
    suggestions = await nominatimSuggest(text, city);
    if (suggestions.length > 0) source = 'nominatim';
  }

  return NextResponse.json({ ok: true, suggestions, source });
}
