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

const PAYMENT_STATUS_VIEW: Record<string, { emoji: string; label: string }> = {
  pending:  { emoji: '⏳', label: 'Ожидает оплаты' },
  paid:     { emoji: '✅', label: 'Оплачен' },
  failed:   { emoji: '❌', label: 'Не оплачен' },
  refunded: { emoji: '↩️', label: 'Возврат' },
};

const PAYMENT_METHOD_VIEW: Record<string, string> = {
  online: 'Онлайн',
  cash:   'При самовывозе',
};

function priceRu(p: number): string {
  return new Intl.NumberFormat('ru-RU').format(p) + ' ₽';
}

export interface PaymentStatusNotificationInput {
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  totalPrice: number;
  paymentMethod: string;
  oldStatus: string;
  newStatus: string;
  source: 'tinkoff' | 'admin'; // where the change came from
}

export async function notifyPaymentStatusChange(input: PaymentStatusNotificationInput): Promise<void> {
  if (input.oldStatus === input.newStatus) return;
  const oldView = PAYMENT_STATUS_VIEW[input.oldStatus] ?? { emoji: '❓', label: input.oldStatus };
  const newView = PAYMENT_STATUS_VIEW[input.newStatus] ?? { emoji: '❓', label: input.newStatus };
  const sourceLabel = input.source === 'tinkoff' ? 'Тинькофф' : 'админка';

  const text = [
    `💰 <b>Статус оплаты изменился</b> (${sourceLabel})`,
    '',
    `Заказ <b>#${input.orderNumber}</b>`,
    `Клиент: ${escapeTgHtml(input.customerName)}`,
    `Телефон: ${escapeTgHtml(input.customerPhone)}`,
    `Сумма: <b>${priceRu(input.totalPrice)}</b>`,
    `Способ: ${PAYMENT_METHOD_VIEW[input.paymentMethod] ?? input.paymentMethod}`,
    '',
    `${oldView.emoji} ${oldView.label}  →  ${newView.emoji} <b>${newView.label}</b>`,
  ].join('\n');

  await sendTelegramMessage(text);
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
