// Бизнес-правила доставки, которые применяются ПОСЛЕ ответа Яндекса.
// Сейчас одно: бесплатная доставка по Москве на заказы от N ₽.
// Порог настраивается в /admin/settings (free_delivery_moscow_amount),
// 0 = правило выключено.

import { prisma } from '@/lib/prisma';

export interface DeliveryRuleContext {
  /** Город получателя — для ПВЗ это название города ПВЗ, для двери — destLocality. */
  city?: string;
  /** Сумма товаров корзины БЕЗ доставки, в рублях. */
  itemsTotalRub: number;
}

export interface DeliveryRuleResult {
  /** Применилось ли какое-то правило (например, бесплатная доставка). */
  applied: boolean;
  /** Новая цена доставки. 0 = бесплатно. */
  priceRub?: number;
  /** Что показать пользователю как пояснение («Заказ от 20 000 ₽ — доставка по Москве бесплатно»). */
  reason?: string;
}

const NEUTRAL: DeliveryRuleResult = { applied: false };

function isMoscow(city: string | undefined): boolean {
  if (!city) return false;
  return /москв/i.test(city);
}

/**
 * Проверить, применимы ли скидочные правила к этой доставке.
 * Возвращает override цены (например, 0) и причину.
 * Если правил нет — { applied: false } и оригинальная цена остаётся.
 */
export async function checkDeliveryRules(ctx: DeliveryRuleContext): Promise<DeliveryRuleResult> {
  const row = await prisma.setting.findUnique({ where: { key: 'free_delivery_moscow_amount' } });
  const threshold = parseInt((row?.value ?? '20000').trim(), 10);
  // 0 или NaN — правило выключено
  if (!Number.isFinite(threshold) || threshold <= 0) return NEUTRAL;

  if (!isMoscow(ctx.city)) return NEUTRAL;
  if (ctx.itemsTotalRub < threshold) return NEUTRAL;

  return {
    applied: true,
    priceRub: 0,
    reason: `Заказ от ${new Intl.NumberFormat('ru-RU').format(threshold)} ₽ — доставка по Москве бесплатно`,
  };
}
