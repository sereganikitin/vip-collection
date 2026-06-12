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
  /** Короткое название только улицы для показа в выпадайке («ул. Ленина», «Тверская улица»). */
  street: string;
  /** Полный адрес для отправки в Я.Доставку. Если у пользователя нет номера дома —
   *  это будет «ул. Ленина, Калуга». Сам номер дома пишется отдельным полем UI. */
  full: string;
  /** Извлечённый из ответа номер дома (если Nominatim его смог распознать в запросе). */
  house?: string;
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

    const seen = new Set<string>();
    const suggestions: GeoSuggestion[] = [];
    for (const d of Array.isArray(data) ? data : []) {
      const lat = parseFloat(d.lat);
      const lng = parseFloat(d.lon);
      if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
      const addr = d.address ?? {};
      const road = addr.road ?? '';
      const cityPart = addr.city ?? addr.town ?? addr.village ?? '';
      // Если дороги нет — это не улица, а POI или район; для подсказки улиц
      // такие пропускаем.
      if (!road) continue;
      // Дедуп: одну и ту же улицу не показываем несколько раз (Nominatim часто
      // отдаёт «ул. Ленина» как уличный объект И как 5 разных домов).
      const dedupKey = `${road}::${cityPart}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
      // full — для отправки в Я.Доставку: «ул. Ленина, Калуга».
      // Номер дома прибавит фронт из отдельного поля.
      const full = cityPart ? `${road}, ${cityPart}` : road;
      suggestions.push({
        street: road,
        full,
        house: addr.house_number ?? undefined,
        lat, lng,
        kind: d.type ?? 'address',
      });
    }

    return NextResponse.json({ ok: true, suggestions });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `Network: ${String(e)}` },
      { status: 502 }
    );
  }
}
