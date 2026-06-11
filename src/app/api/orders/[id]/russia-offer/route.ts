// POST   /api/orders/[id]/russia-offer            — расчёт стоимости (offers/create)
// POST   /api/orders/[id]/russia-offer/confirm    — подтвердить оффер (offers/confirm)
//
// Тело POST для расчёта:
//   { mode: 'pickup', destPlatformId: '<id ПВЗ-получателя>' }
//   { mode: 'door',   destAddress: '...', destLocality?: '...', destGeopoint?: {lat,lng} }

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import type { OrderItemForCargo } from '@/lib/yandex-delivery';
import {
  createRussiaOffer,
  type DeliveryMode,
} from '@/lib/yandex-russia-delivery';

export const dynamic = 'force-dynamic';

async function loadOrderItems(orderId: string) {
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
    width:  oi.product.width,
    height: oi.product.height,
    weight: oi.product.weight,
  }));
  return { order, items };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const data = await loadOrderItems(id);
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const mode = body.mode as DeliveryMode | undefined;

  if (mode !== 'pickup' && mode !== 'door') {
    return NextResponse.json(
      { ok: false, error: 'Параметр mode должен быть "pickup" или "door"' },
      { status: 400 }
    );
  }

  const result = await createRussiaOffer({
    destination:
      mode === 'pickup'
        ? { mode: 'pickup', destPlatformId: String(body.destPlatformId ?? '') }
        : {
            mode: 'door',
            destAddress: String(body.destAddress ?? data.order.deliveryAddress ?? ''),
            destLocality: body.destLocality ? String(body.destLocality) : undefined,
            destGeopoint:
              body.destGeopoint &&
              typeof body.destGeopoint.lat === 'number' &&
              typeof body.destGeopoint.lng === 'number'
                ? { lat: body.destGeopoint.lat, lng: body.destGeopoint.lng }
                : undefined,
          },
    items: data.items,
    recipientName: data.order.customerName,
    recipientPhone: data.order.customerPhone,
    recipientEmail: data.order.customerEmail ?? undefined,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
