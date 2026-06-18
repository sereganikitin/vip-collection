// POST /api/settings/tinkoff-test
// Делает GetTerminalPayouts (легкий read-only метод Тинькоффа) для проверки,
// что пара TerminalKey/Password настоящая и подписывает токен правильно.

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await prisma.setting.findMany({
    where: { key: { in: ['tinkoff_terminal_key', 'tinkoff_password'] } },
  });
  const m = new Map(rows.map((r) => [r.key, r.value]));
  const terminalKey = (m.get('tinkoff_terminal_key') ?? '').trim();
  const password = (m.get('tinkoff_password') ?? '').trim();

  if (!terminalKey || !password) {
    return NextResponse.json({
      ok: false,
      step: 'config',
      error: 'tinkoff_terminal_key или tinkoff_password не заполнены',
    });
  }

  // GetState — самый легкий метод проверки. Но у него нужен PaymentId. Возьмём
  // несуществующий и проверим, что Тинькофф вернёт «Платёж не найден» вместо
  // «Неверный токен». Если придёт «Неверный токен» — значит креды плохие.
  const flatParams = {
    TerminalKey: terminalKey,
    PaymentId: '0', // несуществующий, но это норм — нам важна валидация токена
  };
  const all = { ...flatParams, Password: password };
  const keys = Object.keys(all).sort();
  const concat = keys.map((k) => String((all as Record<string, string>)[k])).join('');
  const token = crypto.createHash('sha256').update(concat).digest('hex');

  try {
    const res = await fetch('https://securepay.tinkoff.ru/v2/GetState', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...flatParams, Token: token }),
    });
    const data = await res.json().catch(() => ({}));

    // 7 / "Payment not found" — токен валидный, просто PaymentId выдуманный.
    // 204 / "Неверный токен" — креды реально плохие.
    const code = String(data.ErrorCode ?? '');
    if (code === '7' || data.Message === 'Платеж не найден' || /payment not found/i.test(String(data.Message ?? ''))) {
      return NextResponse.json({
        ok: true,
        terminalKey,
        message: `✓ Креды валидные. Терминал ${terminalKey} принимает наш токен (тестовый запрос вернул «Платёж не найден» — это норма).`,
      });
    }

    if (code === '204' || /невер.{1,3}токен/i.test(String(data.Message ?? ''))) {
      return NextResponse.json({
        ok: false,
        step: 'token',
        terminalKey,
        error: 'Тинькофф отказал: неверный токен. Проверьте, что Password в /admin/settings совпадает с тем, что в ЛК Т-Бизнеса → Интернет-эквайринг → Терминал → SecretKey.',
        raw: data,
      });
    }

    return NextResponse.json({
      ok: false,
      step: 'unknown',
      terminalKey,
      error: `Неожиданный ответ Тинькоффа (code=${code}, msg=${data.Message ?? '?'}). Подробности в PM2-логах.`,
      raw: data,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      step: 'network',
      error: `Сеть/таймаут: ${String(e)}`,
    });
  }
}
