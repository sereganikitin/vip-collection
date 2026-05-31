// POST /api/settings/telegram-test — диагностика Telegram-уведомлений.
// Кладёт всю инфу о результате в JSON, чтобы админ видел причину отказа.

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  // Берём текущий конфиг прямо из БД — на случай, если только что сохранили
  const rows = await prisma.setting.findMany({
    where: { key: { in: ['tg_bot_token', 'tg_chat_id'] } },
  });
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const token = byKey.get('tg_bot_token')?.trim() ?? '';
  const chatId = byKey.get('tg_chat_id')?.trim() ?? '';

  if (!token) return NextResponse.json({ ok: false, error: 'tg_bot_token не задан в настройках' });
  if (!chatId) return NextResponse.json({ ok: false, error: 'tg_chat_id не задан в настройках' });

  // Сначала валидируем токен через getMe — это нам сразу скажет,
  // живой ли бот и правильный ли токен
  let botInfo: { ok: boolean; result?: { username?: string; first_name?: string }; description?: string } | null = null;
  try {
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      signal: AbortSignal.timeout(8000),
    });
    botInfo = await meRes.json();
    if (!botInfo?.ok) {
      return NextResponse.json({
        ok: false,
        step: 'getMe',
        error: `Токен бота недействителен: ${botInfo?.description ?? 'unknown error'}`,
      });
    }
  } catch (e) {
    return NextResponse.json({
      ok: false,
      step: 'getMe',
      error: `Не удалось связаться с Telegram API: ${String(e)}`,
    });
  }

  // Шлём тестовое сообщение
  const now = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
  const text = [
    `✅ <b>Тест Telegram-уведомлений</b>`,
    '',
    `Время: ${now}`,
    `Бот: @${botInfo.result?.username ?? '?'}`,
    `Чат: <code>${chatId}</code>`,
    '',
    'Если вы видите это сообщение, уведомления о заказах будут приходить сюда.',
  ].join('\n');

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const body = await res.json();

    if (!res.ok || !body.ok) {
      // Самые частые ошибки + расшифровка
      const desc = body.description ?? `HTTP ${res.status}`;
      const hint =
        desc.includes('chat not found')
          ? 'Проверьте chat_id. Для группы: добавьте @userinfobot в чат, он покажет id (для групп он с минусом, например -1001234567890).'
        : desc.includes('Forbidden') && desc.includes('kicked')
          ? 'Бот был исключён из чата. Добавьте его обратно и дайте права на отправку.'
        : desc.includes('Forbidden') && desc.includes('bot was blocked')
          ? 'Пользователь заблокировал бота в личной переписке. Разблокируйте и напишите боту /start.'
        : desc.includes('not enough rights')
          ? 'У бота нет прав отправлять сообщения в этот чат. В настройках чата выдайте боту админ-права.'
        : null;

      return NextResponse.json({
        ok: false,
        step: 'sendMessage',
        error: desc,
        hint,
        botUsername: botInfo.result?.username,
      });
    }

    return NextResponse.json({
      ok: true,
      botUsername: botInfo.result?.username,
      botName: botInfo.result?.first_name,
      chatId,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      step: 'sendMessage',
      error: `Сеть/таймаут: ${String(e)}`,
    });
  }
}
