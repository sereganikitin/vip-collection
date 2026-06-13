// POST /api/checkout/russia-quote
//
// Публичный (без auth) расчёт стоимости Я.Доставки по России для корзины.
// Принимает список товаров из корзины и параметры доставки, отдаёт офферы.
//
// Body:
//   {
//     items: [{ productId: string, quantity: number }, ...],
//     mode: 'pickup' | 'door',
//     // для pickup:
//     destPlatformId?: string,
//     // для door:
//     destAddress?: string,
//     destLocality?: string,
//     destGeopoint?: { lat: number, lng: number },
//     // опционально, если customer уже заполнил контакты:
//     customerName?: string,
//     customerPhone?: string,
//     customerEmail?: string,
//   }

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRussiaOffer, type DeliveryMode } from '@/lib/yandex-russia-delivery';
import { checkDeliveryRules } from '@/lib/delivery-rules';
import type { OrderItemForCargo } from '@/lib/yandex-delivery';

export const dynamic = 'force-dynamic';

interface CartItemInput {
  productId: string;
  quantity: number;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {}

  const mode = body.mode as DeliveryMode | undefined;
  if (mode !== 'pickup' && mode !== 'door') {
    return NextResponse.json(
      { ok: false, error: 'mode должен быть "pickup" или "door"' },
      { status: 400 }
    );
  }

  const rawItems = body.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'Передайте непустой items[]' },
      { status: 400 }
    );
  }

  // Подгружаем товары из БД по productId — берём актуальные цены и габариты
  const ids = rawItems
    .map((x) => (x as CartItemInput).productId)
    .filter((x): x is string => typeof x === 'string');
  const products = await prisma.product.findMany({ where: { id: { in: ids } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const items: OrderItemForCargo[] = [];
  for (const raw of rawItems) {
    const inp = raw as CartItemInput;
    const p = productMap.get(inp.productId);
    if (!p) continue;
    const qty = Math.max(1, Math.min(50, Math.floor(inp.quantity || 1)));
    items.push({
      name: p.name,
      quantity: qty,
      price: p.price,
      categoryId: p.categoryId,
      length: p.length,
      width:  p.width,
      height: p.height,
      weight: p.weight,
    });
  }

  if (items.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'Не удалось определить товары корзины' },
      { status: 400 }
    );
  }

  const result = await createRussiaOffer({
    destination:
      mode === 'pickup'
        ? { mode: 'pickup', destPlatformId: String(body.destPlatformId ?? '') }
        : {
            mode: 'door',
            destAddress: String(body.destAddress ?? ''),
            destLocality: body.destLocality ? String(body.destLocality) : undefined,
            destGeopoint:
              body.destGeopoint &&
              typeof (body.destGeopoint as { lat?: unknown }).lat === 'number' &&
              typeof (body.destGeopoint as { lng?: unknown }).lng === 'number'
                ? { lat: (body.destGeopoint as { lat: number }).lat, lng: (body.destGeopoint as { lng: number }).lng }
                : undefined,
          },
    items,
    // Если покупатель уже заполнил контакты — берём их, иначе placeholder.
    // Quote-этап не требует реальных данных, но Platform валидирует структуру.
    recipientName:  String(body.customerName ?? 'Получатель'),
    recipientPhone: String(body.customerPhone ?? '+79999999999'),
    recipientEmail: typeof body.customerEmail === 'string' ? body.customerEmail : undefined,
  });

  // Применяем бизнес-правила (бесплатная доставка по Москве от X ₽).
  // Для pickup-режима город приходит отдельным полем body.city (он же
  // у покупателя на форме), для door — destLocality.
  const itemsTotalRub = items.reduce((s, it) => s + it.price * it.quantity, 0);
  const cityForRules =
    mode === 'door'
      ? (body.destLocality ? String(body.destLocality) : undefined)
      : (body.city ? String(body.city) : undefined);
  const rule = await checkDeliveryRules({ city: cityForRules, itemsTotalRub });

  if (result.ok && rule.applied && Array.isArray(result.offers)) {
    for (const o of result.offers) {
      o.priceRub = rule.priceRub ?? 0;
    }
  }

  return NextResponse.json(
    {
      ...result,
      freeDelivery: rule.applied,
      freeDeliveryReason: rule.reason,
    },
    { status: result.ok ? 200 : 502 }
  );
}
