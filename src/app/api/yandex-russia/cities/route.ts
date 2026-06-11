// GET /api/yandex-russia/cities — список поддерживаемых городов
// для селектора в админке. Возвращает [{ name, geoId }].

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listCities } from '@/lib/russia-geo';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ cities: listCities() });
}
