// POST /api/wholesale-requests — публичный приём заявок от оптовиков
//   Тело: { name, companyName, phone, email?, city?, message }
//   Делает: сохранение в БД + уведомление в TG + email админам.
//
// GET  /api/wholesale-requests?filter=unread|all — список заявок (только админ)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { sendTelegramMessage, escapeTgHtml } from '@/lib/telegram';
import { sendWholesaleRequestEmail } from '@/lib/mail';
import {
  validateRussianPhone,
  validateEmailFormat,
  checkEmailDomainExists,
} from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name ?? '').trim().slice(0, 100);
    const companyName = String(body.companyName ?? '').trim().slice(0, 200);
    const phoneRaw = String(body.phone ?? '').trim().slice(0, 40);
    const emailRaw = body.email ? String(body.email).trim().slice(0, 200) : '';
    const city = String(body.city ?? '').trim().slice(0, 100) || null;
    const message = String(body.message ?? '').trim().slice(0, 4000);

    if (!name || !companyName || !phoneRaw || !message) {
      return NextResponse.json({ error: 'Заполните все обязательные поля' }, { status: 400 });
    }

    const phoneCheck = validateRussianPhone(phoneRaw);
    if (!phoneCheck.ok) {
      return NextResponse.json({ error: phoneCheck.error }, { status: 400 });
    }
    const phone = phoneCheck.normalized!;

    let email: string | null = null;
    if (emailRaw) {
      const fmt = validateEmailFormat(emailRaw);
      if (!fmt.ok) {
        return NextResponse.json({ error: fmt.error }, { status: 400 });
      }
      const domainOk = await checkEmailDomainExists(emailRaw);
      if (domainOk === false) {
        return NextResponse.json(
          { error: 'Домен email не существует или не принимает почту. Проверьте адрес.' },
          { status: 400 }
        );
      }
      email = emailRaw;
    }

    const wr = await prisma.wholesaleRequest.create({
      data: { name, companyName, phone, email, city, message },
    });

    // Telegram-уведомление (тот же бот, что для заказов и обычной формы).
    sendTelegramMessage(
      [
        '🏪 <b>Новая заявка от оптовика</b>',
        '',
        `<b>Компания:</b> ${escapeTgHtml(companyName)}`,
        `<b>Контактное лицо:</b> ${escapeTgHtml(name)}`,
        `<b>Телефон:</b> ${escapeTgHtml(phone)}`,
        email ? `<b>Email:</b> ${escapeTgHtml(email)}` : '',
        city ? `<b>Город:</b> ${escapeTgHtml(city)}` : '',
        '',
        escapeTgHtml(message),
      ]
        .filter(Boolean)
        .join('\n')
    )
      .then((ok) => {
        if (!ok) {
          console.warn(
            `[WHOLESALE #${wr.id}] Telegram notification FAILED. Проверьте tg_bot_token / tg_chat_id.`
          );
        }
      })
      .catch((e) => console.error(`[WHOLESALE #${wr.id}] Telegram threw:`, e));

    // Email админам — fire-and-forget.
    sendWholesaleRequestEmail({
      name,
      companyName,
      phone,
      email,
      city,
      message,
      receivedAt: wr.createdAt,
    }).catch((e) => console.error(`[WHOLESALE #${wr.id}] Email failed:`, e));

    return NextResponse.json({ ok: true, id: wr.id });
  } catch (e) {
    console.error('wholesale POST error:', e);
    return NextResponse.json({ error: 'Не удалось отправить. Попробуйте позже.' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const filter = req.nextUrl.searchParams.get('filter') ?? 'all';
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '200'), 500);
  const where = filter === 'unread' ? { isRead: false } : {};

  const [items, total, unread] = await Promise.all([
    prisma.wholesaleRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.wholesaleRequest.count(),
    prisma.wholesaleRequest.count({ where: { isRead: false } }),
  ]);

  return NextResponse.json({ items, total, unread });
}
