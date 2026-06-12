/* eslint-disable no-console */
/**
 * Отправка короткого сообщения о состоянии sync-скрипта в тот же
 * Telegram-бот, который уже настроен для уведомлений о заказах.
 *
 * Использование:
 *   npx tsx scripts/notify-sync.ts "✅ Sync OK: created=3 updated=12"
 *
 * Берёт tg_bot_token и tg_chat_id из таблицы Setting (общие с
 * админкой). Если не настроены — молча выходит с кодом 0, чтобы
 * не валить cron из-за отсутствия бота.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const message = process.argv.slice(2).join(' ').trim();
  if (!message) {
    console.error('Usage: notify-sync.ts <message>');
    process.exit(2);
  }

  const rows = await prisma.setting.findMany({
    where: { key: { in: ['tg_bot_token', 'tg_chat_id'] } },
  });
  const m = new Map(rows.map((r) => [r.key, r.value]));
  const token = (m.get('tg_bot_token') ?? '').trim();
  const chatId = (m.get('tg_chat_id') ?? '').trim();
  await prisma.$disconnect();

  if (!token || !chatId) {
    console.log('TG не настроен (tg_bot_token/tg_chat_id пустые) — уведомление пропущено');
    process.exit(0);
  }

  const text = `🔄 <b>sync vipcoll.ru</b>\n\n${message}`;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`TG sendMessage HTTP ${res.status}: ${body.slice(0, 500)}`);
    process.exit(1);
  }
  console.log('TG notify sent');
}

main().catch((e) => { console.error(e); process.exit(1); });
