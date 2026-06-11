// POST /api/orders/[id]/claim     — создать заявку в Я.Доставке
// GET  /api/orders/[id]/claim     — оценка стоимости + статус, если заявка уже есть
// DELETE /api/orders/[id]/claim   — отменить заявку
//
// Body for POST: { taxiClass?: 'courier' | 'express' | 'cargo' }
// Body for GET (query): ?check_price=1 — вместо статуса вернёт оценку для всех тарифов.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import {
  checkPrice, createClaim, getClaimInfo, cancelClaim,
  type OrderItemForCargo,
} from '@/lib/yandex-delivery';

export const dynamic = 'force-dynamic';

async function loadOrderItems(orderId: string): Promise<{
  order: NonNullable<Awaited<ReturnType<typeof prisma.order.findUnique>>>;
  items: OrderItemForCargo[];
} | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });
  if (!order) return null;
  const items: OrderItemForCargo[] = order.items.map((oi) => ({
    name: oi.product.name,
    quantity: oi.quantity,
    price: oi.price,
    categoryId: oi.product.categoryId,
    length: oi.product.length,
    width: oi.product.width,
    height: oi.product.height,
    weight: oi.product.weight,
  }));
  return { order, items };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const data = await loadOrderItems(id);
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const wantPrice = req.nextUrl.searchParams.get('check_price') === '1';

  if (wantPrice) {
    if (!data.order.deliveryAddress) {
      return NextResponse.json({ ok: false, error: 'У заказа нет адреса доставки' }, { status: 400 });
    }
    // Только Cargo (курьер по Москве). Я.Доставка по России идёт через
    // отдельный route /api/orders/[id]/russia-offer — там свой UI с выбором
    // режима (ПВЗ или дверь) и города, которые Cargo-флоу не покрывает.
    const cargo = await checkPrice({
      destinationAddress: data.order.deliveryAddress,
      items: data.items,
    });

    const quotes = cargo.ok && cargo.quotes
      ? cargo.quotes.map((q) => ({ ...q, source: 'cargo' as const }))
      : [];

    return NextResponse.json({
      ok: quotes.length > 0,
      quotes,
      destination: cargo.destination,
      errors: { cargo: cargo.ok ? null : cargo.error },
    });
  }

  if (data.order.yandexClaimId) {
    const info = await getClaimInfo(data.order.yandexClaimId);
    return NextResponse.json({
      ...info,
      claimId: data.order.yandexClaimId,
      price: data.order.yandexClaimPrice,
      tariff: data.order.yandexClaimTariff,
      url: data.order.yandexClaimUrl,
    });
  }

  return NextResponse.json({ ok: true, claimExists: false });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const data = await loadOrderItems(id);
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (data.order.yandexClaimId) {
    return NextResponse.json({ ok: false, error: 'Заявка уже создана' }, { status: 409 });
  }
  if (!data.order.deliveryAddress) {
    return NextResponse.json({ ok: false, error: 'У заказа нет адреса доставки' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const taxiClass = typeof body.taxiClass === 'string' ? body.taxiClass : 'courier';

  const result = await createClaim({
    orderNumber: data.order.number,
    customerName: data.order.customerName,
    customerPhone: data.order.customerPhone,
    destinationAddress: data.order.deliveryAddress,
    items: data.items,
    taxiClass,
    comment: data.order.comment ?? undefined,
  });

  if (!result.ok || !result.claimId) {
    return NextResponse.json(result, { status: 502 });
  }

  await prisma.order.update({
    where: { id },
    data: {
      yandexClaimId: result.claimId,
      yandexClaimStatus: result.status ?? 'new',
      yandexClaimTariff: taxiClass,
      yandexClaimPrice: result.price ?? null,
      yandexClaimEta: result.eta ?? null,
      yandexClaimUrl: result.trackingUrl ?? null,
      yandexClaimCreatedAt: new Date(),
    },
  });

  return NextResponse.json(result);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!order.yandexClaimId) {
    return NextResponse.json({ ok: false, error: 'Заявки нет' }, { status: 400 });
  }

  const isRussia = order.yandexClaimTariff?.startsWith('russia-');

  if (isRussia) {
    // Platform-заявки отменяются в кабинете Я.Доставки. В нашей БД просто
    // обнуляем привязку, чтобы можно было заново посчитать варианты.
    await prisma.order.update({
      where: { id },
      data: {
        yandexClaimId: null,
        yandexClaimStatus: null,
        yandexClaimTariff: null,
        yandexClaimPrice: null,
        yandexClaimEta: null,
        yandexClaimUrl: null,
        yandexClaimCreatedAt: null,
      },
    });
    return NextResponse.json({
      ok: true,
      info: 'Привязка удалена в нашей БД. Саму заявку в Я.Доставке нужно отменить в кабинете Yandex.',
    });
  }

  const result = await cancelClaim(order.yandexClaimId);
  if (!result.ok) return NextResponse.json(result, { status: 502 });

  await prisma.order.update({
    where: { id },
    data: { yandexClaimStatus: 'cancelled' },
  });

  return NextResponse.json({ ok: true });
}
