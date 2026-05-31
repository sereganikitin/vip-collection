// POST /api/orders/[id]/notify — переотправить уведомления о заказе
// (email админу/клиенту + Telegram). Полезно если боту не пришло
// уведомление при создании заказа.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { sendOrderEmails } from '@/lib/mail';
import { sendTelegramMessage, escapeTgHtml } from '@/lib/telegram';

function priceRu(p: number): string {
  return new Intl.NumberFormat('ru-RU').format(p) + ' ₽';
}

export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } } },
  });
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // 1. Email — параллельно
  const emailPromise = sendOrderEmails({
    orderNumber: order.number,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail ?? undefined,
    deliveryMethod: order.deliveryMethod ?? undefined,
    deliveryAddress: order.deliveryAddress ?? undefined,
    comment: order.comment ?? undefined,
    totalPrice: order.totalPrice,
    items: order.items.map((item) => ({
      name: item.product.name,
      quantity: item.quantity,
      price: item.price,
    })),
  })
    .then(() => ({ ok: true as const }))
    .catch((e) => ({ ok: false as const, error: String(e) }));

  // 2. Telegram — здесь хотим увидеть результат, потому что главная цель —
  //    починить «не пришло в бот»
  const itemsList = order.items
    .map((i) => `• ${escapeTgHtml(i.product.name)} × ${i.quantity} — ${priceRu(i.price * i.quantity)}`)
    .join('\n');
  const tgText = [
    `🛍 <b>Заказ #${order.number} — переотправка</b>`,
    '',
    `<b>Клиент:</b> ${escapeTgHtml(order.customerName)}`,
    `<b>Телефон:</b> ${escapeTgHtml(order.customerPhone)}`,
    order.customerEmail ? `<b>Email:</b> ${escapeTgHtml(order.customerEmail)}` : '',
    order.deliveryMethod ? `<b>Доставка:</b> ${escapeTgHtml(order.deliveryMethod)}` : '',
    order.deliveryAddress ? `<b>Адрес:</b> ${escapeTgHtml(order.deliveryAddress)}` : '',
    order.comment ? `<b>Комментарий:</b> ${escapeTgHtml(order.comment)}` : '',
    '',
    itemsList,
    '',
    `<b>Итого: ${priceRu(order.totalPrice)}</b>`,
  ]
    .filter(Boolean)
    .join('\n');

  const tgOk = await sendTelegramMessage(tgText);
  const emailResult = await emailPromise;

  return NextResponse.json({
    telegram: { ok: tgOk },
    email: emailResult,
  });
}
