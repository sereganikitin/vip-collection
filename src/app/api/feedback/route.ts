import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { sendTelegramMessage, escapeTgHtml } from '@/lib/telegram';
import { sendFeedbackEmail } from '@/lib/mail';
import { validateRussianPhone } from '@/lib/validation';

export const dynamic = 'force-dynamic';

// Публичный POST — приём сообщений из виджета на сайте.
// Сохраняет в БД, шлёт уведомление в Telegram + на email админам.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name ?? '').trim().slice(0, 100);
    const phone = String(body.phone ?? '').trim().slice(0, 40);
    const message = String(body.message ?? '').trim().slice(0, 2000);

    if (!name || !phone || !message) {
      return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 });
    }
    const phoneCheck = validateRussianPhone(phone);
    if (!phoneCheck.ok) {
      return NextResponse.json({ error: phoneCheck.error }, { status: 400 });
    }
    const normalizedPhone = phoneCheck.normalized!;

    const fb = await prisma.feedback.create({
      data: { name, phone: normalizedPhone, message },
    });

    // Telegram — fire-and-forget; явный warning если бот не сконфигурирован.
    sendTelegramMessage(
      [
        '💬 <b>Новое сообщение с формы обратной связи</b>',
        '',
        `<b>Имя:</b> ${escapeTgHtml(name)}`,
        `<b>Телефон:</b> ${escapeTgHtml(normalizedPhone)}`,
        '',
        escapeTgHtml(message),
      ].join('\n')
    )
      .then((ok) => {
        if (!ok) {
          console.warn(
            `[FEEDBACK #${fb.id}] Telegram notification FAILED. ` +
              'Проверьте tg_bot_token / tg_chat_id в админке.'
          );
        }
      })
      .catch((e) => console.error(`[FEEDBACK #${fb.id}] Telegram threw:`, e));

    // Email — fire-and-forget, шлёт на все адреса из admin_email (через запятую).
    sendFeedbackEmail({
      name,
      phone: normalizedPhone,
      message,
      receivedAt: fb.createdAt,
    }).catch((e) => console.error(`[FEEDBACK #${fb.id}] Email failed:`, e));

    return NextResponse.json({ ok: true, id: fb.id });
  } catch (e) {
    console.error('feedback POST error:', e);
    return NextResponse.json({ error: 'Не удалось отправить. Попробуйте позже.' }, { status: 500 });
  }
}

// GET — список обращений для админки.
// Параметры: ?filter=unread|all (по умолчанию all), ?limit=N (макс. 200)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const filter = searchParams.get('filter') ?? 'all';
  const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500);

  const where = filter === 'unread' ? { isRead: false } : {};

  const [items, total, unread] = await Promise.all([
    prisma.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.feedback.count(),
    prisma.feedback.count({ where: { isRead: false } }),
  ]);

  return NextResponse.json({ items, total, unread });
}
