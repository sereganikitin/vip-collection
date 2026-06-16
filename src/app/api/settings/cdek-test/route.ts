// POST /api/settings/cdek-test
// Возвращает результат OAuth и тестового поиска города «Москва» —
// быстрый способ убедиться что креды СДЭК работают.

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { findCdekCity, getCdekConfig } from '@/lib/cdek';

export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cfg = await getCdekConfig();
  if (!cfg) {
    return NextResponse.json({
      ok: false,
      step: 'config',
      error: 'cdek_account или cdek_password не заполнены в /admin/settings',
    });
  }

  // Любой реальный API-вызов внутри сделает OAuth → так проверяем сразу
  const city = await findCdekCity('Москва');
  if (!city) {
    return NextResponse.json({
      ok: false,
      step: 'api',
      env: cfg.testMode ? 'test' : 'prod',
      sender: { code: cfg.senderCityCode, address: cfg.senderAddress },
      error: 'СДЭК не ответил или не нашёл «Москва». Проверьте PM2-логи: pm2 logs vip-collection | grep cdek',
    });
  }

  return NextResponse.json({
    ok: true,
    env: cfg.testMode ? 'test' : 'prod',
    sender: { code: cfg.senderCityCode, address: cfg.senderAddress },
    moscowFound: city,
    tariffs: { pickup: cfg.tariffPickup, door: cfg.tariffDoor },
  });
}
