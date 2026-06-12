// GET /api/yandex-russia/suggest?text=...&city=...
//
// Подсказки улиц для чекаута.
//
// Yandex Geocoder с kind=street — основной источник: он умеет префиксное
// совпадение для русских названий улиц, что Nominatim делает плохо
// (Nominatim требует почти полное название). Geocoder возвращает «Тучковская улица»
// уже на «Тучков», а Nominatim — только на полном слове.
//
// Если Geocoder вернул пусто (например, ключ не настроен или таймаут) —
// фолбэк на Nominatim, чтобы хоть что-то показать.

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

// ── Yandex Geocoder (primary) ────────────────────────────────

async function yandexSuggest(text: string, city: string, apiKey: string): Promise<GeoSuggestion[]> {
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

  // Достаём ключ Геокодера для основного пути
  const row = await prisma.setting.findUnique({ where: { key: 'yd_geocoder_key' } });
  const apiKey = (row?.value ?? '').trim();

  // 1) Yandex Geocoder
  let suggestions: GeoSuggestion[] = [];
  if (apiKey) {
    suggestions = await yandexSuggest(text, city, apiKey);
  }

  // 2) Fallback на Nominatim, если Yandex ничего не дал
  if (suggestions.length === 0) {
    suggestions = await nominatimSuggest(text, city);
  }

  return NextResponse.json({
    ok: true,
    suggestions,
    source: suggestions.length === 0 ? 'none' : (apiKey ? 'yandex' : 'nominatim'),
  });
}
