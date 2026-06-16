// POST /api/checkout/cdek-quote
//
// Публичный (без auth) расчёт стоимости СДЭК для корзины — параллельный
// аналог /api/checkout/russia-quote. Фронт чекаута вызывает оба эндпоинта
// одновременно, мерджит офферы и показывает все варианты.
//
// Body:
//   {
//     items: [{ productId, quantity }, ...],
//     mode: 'pickup' | 'door',
//     city: 'Калуга',           — нужно для поиска кода города СДЭК
//                                  и для бизнес-правил (бесплатная Москва)
//   }

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveItemDims } from '@/lib/delivery-defaults';
import { calculateCdekQuote, findCdekCity } from '@/lib/cdek';
import { checkDeliveryRules } from '@/lib/delivery-rules';

export const dynamic = 'force-dynamic';

interface CartItemInput {
  productId: string;
  quantity: number;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {}

  const mode = body.mode === 'door' ? 'door' : body.mode === 'pickup' ? 'pickup' : null;
  if (!mode) {
    return NextResponse.json(
      { ok: false, error: 'mode должен быть "pickup" или "door"' },
      { status: 400 }
    );
  }

  const city = typeof body.city === 'string' ? body.city.trim() : '';
  if (!city) {
    return NextResponse.json(
      { ok: false, error: 'Передайте city' },
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

  // 1) Резолвим город СДЭК по имени → city_code
  const cityMatch = await findCdekCity(city);
  if (!cityMatch) {
    return NextResponse.json({
      ok: false,
      error: `СДЭК не нашёл город «${city}». Возможно, написание отличается от справочника СДЭК.`,
    });
  }

  // 2) Грузим товары, считаем габариты упаковки
  const ids = rawItems
    .map((x) => (x as CartItemInput).productId)
    .filter((x): x is string => typeof x === 'string');
  const products = await prisma.product.findMany({ where: { id: { in: ids } } });
  const pmap = new Map(products.map((p) => [p.id, p]));

  let weightGr = 0;
  let maxL = 0, maxW = 0, maxH = 0;
  let itemsTotalRub = 0;
  let foundCount = 0;
  for (const raw of rawItems) {
    const inp = raw as CartItemInput;
    const p = pmap.get(inp.productId);
    if (!p) continue;
    foundCount += 1;
    const qty = Math.max(1, Math.min(50, Math.floor(inp.quantity || 1)));
    const dims = resolveItemDims(p.categoryId, {
      length: p.length ?? undefined,
      width:  p.width  ?? undefined,
      height: p.height ?? undefined,
      weight: p.weight ?? undefined,
    });
    weightGr += Math.round(dims.weight * 1000) * qty;
    maxL = Math.max(maxL, dims.length);
    maxW = Math.max(maxW, dims.width);
    maxH = Math.max(maxH, dims.height);
    itemsTotalRub += p.price * qty;
  }
  if (foundCount === 0) {
    return NextResponse.json(
      { ok: false, error: 'Не удалось определить товары корзины' },
      { status: 400 }
    );
  }

  // 3) Считаем тариф СДЭК
  const result = await calculateCdekQuote({
    toCityCode: cityMatch.code,
    weightGr,
    lengthCm: maxL,
    widthCm: maxW,
    heightCm: maxH,
    mode,
  });

  if (!result.ok || !result.quote) {
    return NextResponse.json({ ok: false, error: result.error ?? 'Не удалось получить тариф СДЭК' });
  }

  // 4) Применяем бизнес-правила (бесплатная доставка по Москве)
  const rule = await checkDeliveryRules({ city, itemsTotalRub });
  let finalPrice = Math.round(result.quote.priceRub);
  if (rule.applied) {
    finalPrice = rule.priceRub ?? 0;
  }

  // 5) Возвращаем в том же формате, что у Я.Доставки — фронту удобнее мерджить
  const periodDays = result.quote.periodMinDays ?? result.quote.periodMaxDays;
  const eta =
    result.quote.periodMinDays && result.quote.periodMaxDays
      ? `${result.quote.periodMinDays}-${result.quote.periodMaxDays} дн.`
      : periodDays ? `${periodDays} дн.` : undefined;

  return NextResponse.json({
    ok: true,
    offers: [
      {
        offerId: `cdek-${result.quote.tariffCode}-${cityMatch.code}-${Date.now().toString(36)}`,
        priceRub: finalPrice,
        partner: 'СДЭК',
        provider: 'cdek',
        tariffCode: result.quote.tariffCode,
        cityCode: cityMatch.code,
        cityName: cityMatch.city,
        eta,
        deliveryFromIso: undefined,
        deliveryToIso: undefined,
      },
    ],
    freeDelivery: rule.applied,
    freeDeliveryReason: rule.reason,
  });
}
