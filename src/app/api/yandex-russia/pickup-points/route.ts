// GET /api/yandex-russia/pickup-points?city=Калуга  (или ?geoId=6)
//
// Прокси к Platform /api/b2b/platform/pickup-points/list для админ-UI и чекаута.
//
// Логика resolve города:
//   1. Если задан ?geoId числом — используем как есть (для отладки/руки).
//   2. Если city найден в нашей таблице RUSSIA_GEO_IDS — берём прямой geo_id.
//   3. Иначе фолбэк через Геокодер:
//      - геокодим город, узнаём координаты + регион,
//      - используем geo_id региона (Московская область = 1, всё иначе — 225 = Россия),
//      - запрашиваем ПВЗ этим широким geo_id,
//      - фильтруем результат по дистанции ≤ 50 км от координат города.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { findGeoId } from '@/lib/russia-geo';
import { distanceKm, geocodeCity, listPickupPoints, type PickupPoint } from '@/lib/yandex-russia-delivery';

export const dynamic = 'force-dynamic';

// geo_id для регионального фолбэка
const GEO_MOSCOW_OBLAST = 1;
const GEO_RUSSIA = 225;
const MAX_DISTANCE_KM = 50;

function isAuthOptional(req: NextRequest): boolean {
  // Чекаут — публичный, админка — за auth. Различаем по реферу:
  // если запрос идёт со страницы /admin/* — требуем auth, иначе нет.
  // Для надёжности можно явно проверять auth и пропускать вызовы без него.
  return !req.headers.get('referer')?.includes('/admin/');
}

export async function GET(req: NextRequest) {
  // Проверка auth только для админ-вызовов; чекаут публичный.
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
          `Проверьте написание или попробуйте ближайший крупный город.`,
      },
      { status: 404 }
    );
  }

  // Выбираем широкий geo_id региона.
  // «Московская область» → 1; всё иначе (включая «Москва», другие области, республики) → 225.
  // Москва как город уже была бы в таблице (geo_id=213), сюда мы попадаем только
  // для не-табличных городов.
  const broadGeoId =
    geo.province && /москов/i.test(geo.province) ? GEO_MOSCOW_OBLAST : GEO_RUSSIA;

  const result = await listPickupPoints(broadGeoId);
  if (!result.ok || !result.points) {
    return NextResponse.json({
      ...result,
      geoId: broadGeoId,
      resolvedBy: 'geocoder',
      geocoded: { lat: geo.lat, lng: geo.lng, locality: geo.locality, province: geo.province },
    });
  }

  // Фильтр по дистанции от центра города.
  const nearby = result.points.filter((p: PickupPoint) => {
    if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return false;
    return distanceKm(p.lat, p.lng, geo.lat, geo.lng) <= MAX_DISTANCE_KM;
  });

  return NextResponse.json({
    ok: true,
    points: nearby,
    geoId: broadGeoId,
    resolvedBy: 'geocoder',
    geocoded: { lat: geo.lat, lng: geo.lng, locality: geo.locality, province: geo.province },
    totalBeforeFilter: result.points.length,
  });
}
