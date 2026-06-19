import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { sendOrderEmails } from '@/lib/mail';
import { sendTelegramMessage, escapeTgHtml } from '@/lib/telegram';
import { validateRussianPhone, validateEmailFormat } from '@/lib/validation';

function formatPriceRu(p: number): string {
  return new Intl.NumberFormat('ru-RU').format(p) + ' ₽';
}

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orders = await prisma.order.findMany({
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const tStart = Date.now();
  const stage = (label: string) => console.log(`[orders POST] ${label}: +${Date.now() - tStart}ms`);

  try {
    const data = await req.json();
    stage('body parsed');
    const {
      items, customerName, customerPhone, customerEmail,
      deliveryAddress, deliveryMethod, comment, paymentMethod,
      deliveryPrice, yandexRussiaMeta,
    } = data;
    const pm: 'cash' | 'online' = paymentMethod === 'online' ? 'online' : 'cash';

    if (!items?.length || !customerName || !customerPhone) {
      return NextResponse.json({ error: 'Заполните обязательные поля' }, { status: 400 });
    }

    // Валидация телефона: формат + российский мобильный + анти-фейк
    const phoneCheck = validateRussianPhone(String(customerPhone));
    if (!phoneCheck.ok) {
      return NextResponse.json({ error: phoneCheck.error }, { status: 400 });
    }
    const normalizedPhone = phoneCheck.normalized!;

    // Валидация email: только формат. DNS-проверка домена убрана —
    // она занимала 4-7 сек на каждом заказе (MX+A lookup с таймаутами)
    // и сильно тормозила переход к оплате. Опечатки в популярных доменах
    // ловит typo-хинт на фронте (gmial.com → gmail.com и т.п.).
    let validatedEmail: string | null = null;
    if (customerEmail && String(customerEmail).trim() !== '') {
      const fmt = validateEmailFormat(String(customerEmail));
      if (!fmt.ok) {
        return NextResponse.json({ error: fmt.error }, { status: 400 });
      }
      validatedEmail = String(customerEmail).trim();
    }
    stage('validation done');

    // Items can contain productId (DB id) or productSlug (from static data)
    // Try to resolve all products from DB
    const slugs = items.map((i: { productSlug?: string }) => i.productSlug).filter(Boolean);
    const ids = items.map((i: { productId?: string }) => i.productId).filter(Boolean);

    let products = await prisma.product.findMany({
      where: {
        OR: [
          ...(ids.length > 0 ? [{ id: { in: ids } }] : []),
          ...(slugs.length > 0 ? [{ slug: { in: slugs } }] : []),
        ],
      },
    });
    stage('products fetched');

    // If no products found by id, try matching by slug from the items
    if (products.length === 0) {
      return NextResponse.json({ error: 'Товары не найдены в базе данных' }, { status: 400 });
    }

    // Build order items, matching by id or slug
    const orderItems = items.map((item: { productId?: string; productSlug?: string; quantity: number }) => {
      const product = products.find(
        (p) => p.id === item.productId || p.slug === item.productSlug
      );
      if (!product) return null;
      return {
        productId: product.id,
        quantity: item.quantity,
        price: product.price,
      };
    }).filter(Boolean);

    if (orderItems.length === 0) {
      return NextResponse.json({ error: 'Не удалось найти товары для заказа' }, { status: 400 });
    }

    const itemsTotal = orderItems.reduce(
      (sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0
    );
    // Доставка добавляется к итогу. Если поле не пришло — считаем 0.
    const shippingCost =
      typeof deliveryPrice === 'number' && deliveryPrice > 0 ? deliveryPrice : 0;
    const totalPrice = itemsTotal + shippingCost;

    // yandexRussiaMeta приходит как объект — сериализуем в JSON для столбца string.
    let metaJson: string | null = null;
    if (yandexRussiaMeta && typeof yandexRussiaMeta === 'object') {
      try { metaJson = JSON.stringify(yandexRussiaMeta); } catch { metaJson = null; }
    }

    const order = await prisma.order.create({
      data: {
        totalPrice,
        customerName,
        customerPhone: normalizedPhone,
        customerEmail: validatedEmail,
        deliveryAddress,
        deliveryMethod,
        comment,
        paymentMethod: pm,
        deliveryPrice: shippingCost > 0 ? shippingCost : null,
        yandexRussiaMeta: metaJson,
        items: { create: orderItems },
      },
      include: { items: { include: { product: true } } },
    });
    stage('order created');

    // Send email notifications (async, don't block response)
    sendOrderEmails({
      orderNumber: order.number,
      customerName,
      customerPhone,
      customerEmail,
      deliveryMethod,
      deliveryAddress,
      comment,
      totalPrice: order.totalPrice,
      items: order.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.price,
      })),
    }).catch(console.error);

    // Telegram notification (best-effort, same bot as feedback)
    const itemsList = order.items
      .map((i) => `• ${escapeTgHtml(i.product.name)} × ${i.quantity} — ${formatPriceRu(i.price * i.quantity)}`)
      .join('\n');
    const tgText = [
      `🛍 <b>Новый заказ #${order.number}</b>`,
      '',
      `<b>Клиент:</b> ${escapeTgHtml(customerName)}`,
      `<b>Телефон:</b> ${escapeTgHtml(customerPhone)}`,
      customerEmail ? `<b>Email:</b> ${escapeTgHtml(customerEmail)}` : '',
      deliveryMethod ? `<b>Доставка:</b> ${escapeTgHtml(deliveryMethod)}` : '',
      deliveryAddress ? `<b>Адрес:</b> ${escapeTgHtml(deliveryAddress)}` : '',
      comment ? `<b>Комментарий:</b> ${escapeTgHtml(comment)}` : '',
      '',
      itemsList,
      '',
      `<b>Итого: ${formatPriceRu(order.totalPrice)}</b>`,
    ].filter(Boolean).join('\n');
    // Telegram — fire-and-forget, но логируем результат:
    // sendTelegramMessage возвращает false на «тихих» ошибках (нет токена,
    // API вернул не-ok), поэтому отдельно ловим этот случай и пишем в логи
    // громкий warning. На production это видно в `pm2 logs vip-collection`.
    sendTelegramMessage(tgText)
      .then((ok) => {
        if (!ok) {
          console.warn(
            `[ORDER #${order.number}] Telegram notification FAILED. ` +
              'Проверьте tg_bot_token / tg_chat_id в админке и нажмите «Тест Telegram». ' +
              'Можно переотправить уведомление кнопкой «Переотправить TG и email» на странице заказа.'
          );
        }
      })
      .catch((e) => console.error(`[ORDER #${order.number}] Telegram threw:`, e));

    stage('returning response');
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании заказа. Попробуйте позже.' },
      { status: 500 }
    );
  }
}
