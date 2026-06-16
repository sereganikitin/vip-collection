// GET /api/cdek/pickup-points?city=Калуга  или  ?cityCode=44
//
// Прокси к CDEK /v2/deliverypoints. Используется в чекауте, чтобы
// показать ПВЗ СДЭК на той же карте, что и Я.Доставку, разным цветом.

import { NextRequest, NextResponse } from 'next/server';
import { findCdekCity, listCdekPickupPoints } from '@/lib/cdek';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const city = (sp.get('city') ?? '').trim();
  const cityCodeRaw = sp.get('cityCode');

  let cityCode: number | null = null;
  if (cityCodeRaw) {
    const n = parseInt(cityCodeRaw, 10);
    if (Number.isFinite(n) && n > 0) cityCode = n;
  }
  if (!cityCode && city) {
    const match = await findCdekCity(city);
    if (!match) {
      return NextResponse.json({
        ok: false,
        error: `СДЭК не нашёл город «${city}» в своём справочнике`,
      });
    }
    cityCode = match.code;
  }
  if (!cityCode) {
    return NextResponse.json(
      { ok: false, error: 'Передайте ?city=… или ?cityCode=…' },
      { status: 400 }
    );
  }

  const result = await listCdekPickupPoints(cityCode);
  return NextResponse.json({ ...result, cityCode });
}
