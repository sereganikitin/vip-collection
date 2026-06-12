// GET /api/yandex-russia/suggest?text=...&city=...&kind=house|street|locality
//
// Прокси к Yandex Geocoder для подсказок при наборе адреса в чекауте.
// Использует тот же ключ yd_geocoder_key, что и Cargo-флоу.
// Не требует auth — вызывается из публичной формы чекаута.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface GeoSuggestion {
  text: string;          // что показать в выпадайке
  full: string;          // полный formatted адрес
  lat: number;
  lng: number;
  kind: string;          // locality / street / house
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const text = (sp.get('text') ?? '').trim();
  const city = (sp.get('city') ?? '').trim();
  const kind = (sp.get('kind') ?? 'house').trim(); // locality | street | house

  if (text.length < 2) {
    return NextResponse.json({ ok: true, suggestions: [] });
  }

  // Достаём ключ Геокодера из настроек
  const row = await prisma.setting.findUnique({ where: { key: 'yd_geocoder_key' } });
  const apiKey = (row?.value ?? '').trim();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: 'Geocoder API key не настроен в /admin/settings' },
      { status: 503 }
    );
  }

  // Формируем geocode-запрос. Если задан город — приписываем его,
  // чтобы получить подсказки в его пределах.
  const geocode = city && kind !== 'locality' ? `${city}, ${text}` : text;

  const url = new URL('https://geocode-maps.yandex.ru/1.x/');
  url.searchParams.set('apikey', apiKey);
  url.searchParams.set('geocode', geocode);
  url.searchParams.set('format', 'json');
  url.searchParams.set('lang', 'ru_RU');
  url.searchParams.set('results', '8');
  url.searchParams.set('kind', kind);
  if (city && kind === 'house') {
    // Привязка к городу — bbox через rspn=1 + Yandex автоматически приоритизирует
    url.searchParams.set('rspn', '1');
  }

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(6000) });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Geocoder HTTP ${res.status}` },
        { status: 502 }
      );
    }
    const data = await res.json();
    const members =
      (data?.response?.GeoObjectCollection?.featureMember as Array<Record<string, unknown>>) ?? [];

    const suggestions: GeoSuggestion[] = members
      .map((m) => {
        const geo = (m.GeoObject ?? {}) as Record<string, unknown>;
        const pos = (geo.Point as Record<string, string> | undefined)?.pos ?? '';
        const [lngS, latS] = pos.split(' ');
        const lat = parseFloat(latS);
        const lng = parseFloat(lngS);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
        const meta =
          ((geo.metaDataProperty as Record<string, unknown>)?.GeocoderMetaData as Record<string, unknown>) ??
          {};
        const fullAddress =
          ((meta.Address as Record<string, unknown>)?.formatted as string) ??
          ((geo.name as string) ?? '');
        const detectedKind = (meta.kind as string) ?? '';
        // text для подсказки — короткая версия (только улица + дом, без страны/области)
        const shortText = ((geo.description as string) ?? fullAddress);
        return {
          text: (geo.name as string) ?? shortText,
          full: fullAddress,
          lat, lng,
          kind: detectedKind,
        } satisfies GeoSuggestion;
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
