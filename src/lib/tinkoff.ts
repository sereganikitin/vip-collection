/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';

const TINKOFF_API = 'https://securepay.tinkoff.ru/v2';

interface TinkoffConfig {
  terminalKey: string;
  password: string;
}

async function getConfig(): Promise<TinkoffConfig | null> {
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: ['tinkoff_terminal_key', 'tinkoff_password'] } },
    });
    const m = new Map(rows.map((r) => [r.key, r.value]));
    const terminalKey = (m.get('tinkoff_terminal_key') ?? '').trim();
    const password = (m.get('tinkoff_password') ?? '').trim();
    if (!terminalKey || !password) return null;
    return { terminalKey, password };
  } catch {
    return null;
  }
}

/**
 * Tinkoff token rule: take all *flat* (string/number/boolean) top-level
 * parameters of the request, add Password, sort keys alphabetically,
 * concatenate the *values*, then SHA-256. Nested objects (Receipt, DATA)
 * are NOT included.
 */
function generateToken(params: Record<string, string | number | boolean>, password: string): string {
  const all: Record<string, string | number | boolean> = { ...params, Password: password };
  const keys = Object.keys(all).sort();
  const concat = keys.map((k) => String(all[k])).join('');
  return crypto.createHash('sha256').update(concat).digest('hex');
}

export interface TinkoffInitOptions {
  orderId: string;          // Order.id (cuid) — мы шлём как OrderId
  amountRub: number;        // в рублях
  description: string;
  notificationURL: string;  // куда Тинькофф шлёт server-to-server статусы
  successURL: string;       // куда отправлять пользователя после оплаты
  failURL: string;
  customerEmail?: string;
  customerPhone?: string;
  items?: Array<{ name: string; quantity: number; priceRub: number }>; // для Receipt
}

export interface TinkoffInitResult {
  paymentUrl: string;
  paymentId: string;
}

export async function tinkoffInit(opts: TinkoffInitOptions): Promise<TinkoffInitResult | null> {
  const cfg = await getConfig();
  if (!cfg) {
    console.warn('Tinkoff: not configured (terminal_key/password missing)');
    return null;
  }

  const amountKop = Math.round(opts.amountRub * 100);
  const flatParams: Record<string, string | number | boolean> = {
    TerminalKey: cfg.terminalKey,
    Amount: amountKop,
    OrderId: opts.orderId,
    Description: opts.description.slice(0, 250),
    NotificationURL: opts.notificationURL,
    SuccessURL: opts.successURL,
    FailURL: opts.failURL,
  };
  const token = generateToken(flatParams, cfg.password);

  const body: Record<string, any> = { ...flatParams, Token: token };

  if (opts.customerEmail || opts.customerPhone) {
    body.DATA = {
      ...(opts.customerEmail ? { Email: opts.customerEmail } : {}),
      ...(opts.customerPhone ? { Phone: opts.customerPhone } : {}),
    };
  }

  if (opts.items && opts.items.length > 0) {
    body.Receipt = {
      Email: opts.customerEmail || undefined,
      Phone: opts.customerPhone || undefined,
      Taxation: 'usn_income', // ИП на УСН "Доходы"
      Items: opts.items.map((i) => {
        const priceKop = Math.round(i.priceRub * 100);
        return {
          Name: i.name.slice(0, 128),
          Quantity: i.quantity,
          Amount: priceKop * i.quantity,
          Price: priceKop,
          Tax: 'none', // ИП на УСН — без НДС
          PaymentMethod: 'full_payment',
          PaymentObject: 'commodity',
        };
      }),
    };
  }

  try {
    const res = await fetch(`${TINKOFF_API}/Init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || !data.Success) {
      console.warn('Tinkoff Init failed:', res.status, data.ErrorCode, data.Message, data.Details);
      return null;
    }
    return {
      paymentUrl: String(data.PaymentURL),
      paymentId: String(data.PaymentId),
    };
  } catch (e) {
    console.error('Tinkoff Init exception:', e);
    return null;
  }
}

/**
 * Verify a notification (webhook) payload's Token against our stored password.
 * Same flat-fields rule as Init.
 */
export async function verifyNotificationToken(body: Record<string, any>): Promise<boolean> {
  const cfg = await getConfig();
  if (!cfg) return false;
  const token = body.Token;
  if (!token || typeof token !== 'string') return false;

  const flat: Record<string, string | number | boolean> = {};
  for (const k of Object.keys(body)) {
    if (k === 'Token') continue;
    const v = body[k];
    if (v == null) continue;
    if (typeof v === 'object') continue; // skip nested
    flat[k] = v as string | number | boolean;
  }
  const expected = generateToken(flat, cfg.password);
  return expected === token;
}

/**
 * Map Tinkoff statuses to our local payment status.
 */
export function mapTinkoffStatusToLocal(tStatus: string): 'pending' | 'paid' | 'failed' | 'refunded' {
  switch (tStatus) {
    case 'CONFIRMED':
    case 'AUTHORIZED':
      return 'paid';
    case 'REVERSED':
    case 'REFUNDED':
    case 'PARTIAL_REFUNDED':
      return 'refunded';
    case 'REJECTED':
    case 'AUTH_FAIL':
    case 'DEADLINE_EXPIRED':
      return 'failed';
    default:
      return 'pending';
  }
}
