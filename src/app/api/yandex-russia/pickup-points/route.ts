// GET /api/yandex-russia/pickup-points?city=Калуга  (или ?geoId=6)
// Прокси к Platform /api/b2b/platform/pickup-points/list для админ-UI.
// Принимает либо `city` (резолвится через таблицу geo_id),
// либо `geoId` (число) напрямую — на случай города вне таблицы.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { findGeoId } from '@/lib/russia-geo';
import { listPickupPoints } from '@/lib/yandex-russia-delivery';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const city = sp.get('city');
  const geoIdRaw = sp.get('geoId');

  let geoId: number | null = null;
  if (geoIdRaw) {
    const n = parseInt(geoIdRaw, 10);
    if (Number.isFinite(n) && n > 0) geoId = n;
  } else if (city) {
    geoId = findGeoId(city);
  }

  if (geoId == null) {
    return NextResponse.json(
      {
        ok: false,
        error: city
          ? `Город «${city}» не найден в таблице geo_id. Передайте geoId числом или добавьте город в src/lib/russia-geo.ts.`
          : 'Передайте параметр ?city=… или ?geoId=…',
      },
      { status: 400 }
    );
  }

  const result = await listPickupPoints(geoId);
  return NextResponse.json({ ...result, geoId });
}
