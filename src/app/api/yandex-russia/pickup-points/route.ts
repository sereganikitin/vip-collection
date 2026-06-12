// GET /api/yandex-russia/pickup-points?city=Калуга  (или ?geoId=6)
//
// Прокси к Platform /api/b2b/platform/pickup-points/list для админ-UI и чекаута.
//
// Логика resolve города:
//   1. Если задан ?geoId числом — используем как есть (для отладки/руки).
//   2. Если city найден в нашей таблице RUSSIA_GEO_IDS — берём прямой geo_id.
//   3. Иначе фолбэк через Геокодер: геокодим город, получаем координаты + регион,
//      каскадно пробуем несколько широких geo_id (см. ниже), мерджим результаты,
//      фильтруем по дистанции ≤ 50 км от центра города.
//
// Почему каскад: Platform pickup-points/list ожидает city-level geo_id (213, 6, 43),
// а на oblast-level (Московская область = 1) или country-level (Россия = 225)
// может вернуть пусто. Поэтому пробуем кандидатов и собираем что выпало.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { findGeoId } from '@/lib/russia-geo';
import { distanceKm, geocodeCity, listPickupPoints, type PickupPoint } from '@/lib/yandex-russia-delivery';

export const dynamic = 'force-dynamic';

const MAX_DISTANCE_KM = 50;

// Каскад broad geo_id для городов вне таблицы.
//   - Для МО / Москвы пробуем сначала Москва (213, самая популярная),
//     потом МО как регион (1), потом всю Россию (225).
//   - Для остальных регионов пробуем сразу 225.
function broadGeoIdCascade(province: string | undefined): number[] {
  if (province && /москов/i.test(province)) return [213, 1, 225];
  return [225];
}

function isAuthOptional(req: NextRequest): boolean {
  return !req.headers.get('referer')?.includes('/admin/');
}

export async function GET(req: NextRequest) {
  if (!isAuthOptional(req)) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const city = (sp.get('city') ?? '').trim();
  const geoIdRaw = sp.get('geoId');

  // Путь 1: явный geo_id
  if (geoIdRaw) {
    const n = parseInt(geoIdRaw, 10);
    if (Number.isFinite(n) && n > 0) {
      const result = await listPickupPoints(n);
      return NextResponse.json({ ...result, geoId: n });
    }
  }

  if (!city) {
    return NextResponse.json(
      { ok: false, error: 'Передайте ?city=… или ?geoId=…' },
      { status: 400 }
    );
  }

  // Путь 2: город есть в таблице
  const directGeoId = findGeoId(city);
  if (directGeoId) {
    const result = await listPickupPoints(directGeoId);
    return NextResponse.json({ ...result, geoId: directGeoId, resolvedBy: 'table' });
  }

  // Путь 3: геокодер-фолбэк
  const geo = await geocodeCity(city);
  if (!geo) {
    return NextResponse.json(
      {
        ok: false,
        error: `Не удалось определить координаты города «${city}». ` +
          `Возможно, не настроен Yandex Geocoder API или у ключа нет прав. ` +
          `Попробуйте ближайший крупный город или свяжитесь с нами.`,
        resolvedBy: 'geocoder-failed',
      },
      { status: 200 } // ok=false на app-level, но не 404 — чтобы не плодить ошибки в консоли браузера
    );
  }

  // Каскадно пробуем broad geo_id. Останавливаемся, когда нашли хотя бы 1 ПВЗ
  // в пределах 50 км от центра города — этого достаточно для UI.
  const candidates = broadGeoIdCascade(geo.province);
  const tried: Array<{ geoId: number; total: number; nearby: number }> = [];
  let chosen: { geoId: number; points: PickupPoint[] } | null = null;

  for (const candidate of candidates) {
    const result = await listPickupPoints(candidate);
    const allPoints = result.ok && result.points ? result.points : [];
    const nearby = allPoints.filter((p) => {
      if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return false;
      return distanceKm(p.lat, p.lng, geo.lat, geo.lng) <= MAX_DISTANCE_KM;
    });
    tried.push({ geoId: candidate, total: allPoints.length, nearby: nearby.length });
    if (nearby.length > 0) {
      chosen = { geoId: candidate, points: nearby };
      break;
    }
  }

  if (!chosen) {
    return NextResponse.json({
      ok: true,
      points: [],
      geoId: candidates[candidates.length - 1],
      resolvedBy: 'geocoder',
      geocoded: { lat: geo.lat, lng: geo.lng, locality: geo.locality, province: geo.province },
      tried,
      note: 'Я.Доставка не вернула ПВЗ в радиусе 50 км от этого города.',
    });
  }

  return NextResponse.json({
    ok: true,
    points: chosen.points,
    geoId: chosen.geoId,
    resolvedBy: 'geocoder',
    geocoded: { lat: geo.lat, lng: geo.lng, locality: geo.locality, province: geo.province },
    tried,
  });
}
