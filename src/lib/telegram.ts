import { prisma } from '@/lib/prisma';

interface TelegramConfig {
  token: string;
  chatId: string;
}

async function getTelegramConfig(): Promise<TelegramConfig> {
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: ['tg_bot_token', 'tg_chat_id'] } },
    });
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    return {
      token: byKey.get('tg_bot_token') ?? '',
      chatId: byKey.get('tg_chat_id') ?? '',
    };
  } catch {
    return { token: '', chatId: '' };
  }
}

// Escape HTML special characters for Telegram parse_mode=HTML.
export function escapeTgHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Send a Telegram message via Bot API. Returns true on success. Silent on
 * config-missing: lets callers fire-and-forget without breaking the request
 * path if the bot isn't set up yet.
 */
export async function sendTelegramMessage(text: string): Promise<boolean> {
  const { token, chatId } = await getTelegramConfig();
  if (!token || !chatId) {
    console.log('Telegram: not configured (tg_bot_token or tg_chat_id missing)');
    return false;
  }
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
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn('Telegram sendMessage failed:', res.status, body.slice(0, 200));
      return false;
    }
    return true;
  } catch (e) {
    console.error('Telegram error:', e);
    return false;
  }
}
