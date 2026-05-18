import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage, escapeTgHtml } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name ?? '').trim().slice(0, 100);
    const phone = String(body.phone ?? '').trim().slice(0, 40);
    const message = String(body.message ?? '').trim().slice(0, 2000);

    if (!name || !phone || !message) {
      return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 });
    }
    if (phone.replace(/\D/g, '').length < 10) {
      return NextResponse.json({ error: 'Проверьте номер телефона' }, { status: 400 });
    }

    const fb = await prisma.feedback.create({
      data: { name, phone, message },
    });

    const text = [
      '💬 <b>Новое сообщение с формы обратной связи</b>',
      '',
      `<b>Имя:</b> ${escapeTgHtml(name)}`,
      `<b>Телефон:</b> ${escapeTgHtml(phone)}`,
      '',
      escapeTgHtml(message),
    ].join('\n');
    sendTelegramMessage(text).catch((e) => console.error('feedback TG:', e));

    return NextResponse.json({ ok: true, id: fb.id });
  } catch (e) {
    console.error('feedback POST error:', e);
    return NextResponse.json({ error: 'Не удалось отправить. Попробуйте позже.' }, { status: 500 });
  }
}
