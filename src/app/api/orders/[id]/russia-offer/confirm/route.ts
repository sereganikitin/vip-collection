// POST /api/orders/[id]/russia-offer/confirm
// Body: { offerId: string, mode: 'pickup' | 'door', priceRub?: number, eta?: string }
//
// Подтверждает оффер в Я.Доставке и сохраняет результат в поля order.yandexClaim*.
// Используем существующие колонки, маркируя источник через yandexClaimTariff:
//   'russia-pickup' — Platform, ПВЗ→ПВЗ
//   'russia-door'   — Platform, ПВЗ→дверь

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { confirmRussiaOffer } from '@/lib/yandex-russia-delivery';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (order.yandexClaimId) {
    return NextResponse.json(
      { ok: false, error: 'У заказа уже есть заявка в Я.Доставке. Сначала отмените её.' },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const offerId = String(body.offerId ?? '');
  const mode = body.mode === 'door' ? 'russia-door' : 'russia-pickup';
  if (!offerId) {
    return NextResponse.json({ ok: false, error: 'Не передан offerId' }, { status: 400 });
  }

  const result = await confirmRussiaOffer(offerId);
  if (!result.ok || !result.orderId) {
    return NextResponse.json(result, { status: 502 });
  }

  await prisma.order.update({
    where: { id },
    data: {
      yandexClaimId: result.orderId,
      yandexClaimStatus: 'CREATED',
      yandexClaimTariff: mode,
      yandexClaimPrice:
        typeof body.priceRub === 'number' ? body.priceRub : null,
      yandexClaimEta: typeof body.eta === 'string' ? body.eta : null,
      yandexClaimUrl: result.trackingUrl ?? null,
      yandexClaimCreatedAt: new Date(),
    },
  });

  return NextResponse.json(result);
}
