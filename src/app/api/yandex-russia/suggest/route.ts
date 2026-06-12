// GET /api/yandex-russia/suggest?text=...&city=...
//
// Прокси к Nominatim (OpenStreetMap) для подсказок адреса в чекауте.
//
// Почему Nominatim, а не Yandex Geocoder:
// Geocoder работает на полные адреса; на частичный ввод ("Лен" в Калуге)
// он либо возвращает центр города, либо пусто — для автокомплита не годится.
// Nominatim изначально проектировался под частичный поиск и отдаёт улицы
// сразу с 2-3 букв. Не требует ключа, бесплатный.
//
// Rate limit Nominatim: 1 req/sec на IP. Для публичного чекаута это
// не проблема — debounce на клиенте 250 мс, каждый покупатель ходит
// со своего IP.

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface GeoSuggestion {
  text: string;          // короткое название для показа (улица + дом)
  full: string;          // полный адрес (для отправки в Я.Доставку)
  lat: number;
  lng: number;
  kind: string;
}

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

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const text = (sp.get('text') ?? '').trim();
  const city = (sp.get('city') ?? '').trim();

  if (text.length < 2) {
    return NextResponse.json({ ok: true, suggestions: [] });
  }

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
      // Nominatim требует осмысленный User-Agent (default Node UA блокируется)
      headers: { 'User-Agent': 'vipcoll.ru-checkout/1.0 (vipshopp@yandex.ru)' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Nominatim HTTP ${res.status}` },
        { status: 502 }
      );
    }
    const data = (await res.json()) as NominatimItem[];

    const suggestions: GeoSuggestion[] = (Array.isArray(data) ? data : [])
      .map((d) => {
        const lat = parseFloat(d.lat);
        const lng = parseFloat(d.lon);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
        const addr = d.address ?? {};
        // Короткий читаемый «улица [дом], город»
        const streetPart = addr.road
          ? `${addr.road}${addr.house_number ? ' ' + addr.house_number : ''}`
          : '';
        const cityPart = addr.city ?? addr.town ?? addr.village ?? '';
        const shortText = [streetPart, cityPart].filter(Boolean).join(', ') || d.display_name;
        return {
          text: shortText,
          full: d.display_name,
          lat, lng,
          kind: d.type ?? 'address',
        };
      })
      .filter((x): x is GeoSuggestion => x !== null);

    return NextResponse.json({ ok: true, suggestions });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `Network: ${String(e)}` },
      { status: 502 }
    );
  }
}
