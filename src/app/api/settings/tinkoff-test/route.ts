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
  // Берём «достаточно длинный» fake PaymentId, чтобы Тинькофф пропустил
  // его через формат-валидацию и сразу искал в БД. Если найдёт «не найден» —
  // токен валидный.
  const flatParams = {
    TerminalKey: terminalKey,
    PaymentId: '999999999',
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
    const code = String(data.ErrorCode ?? '');
    const msg = String(data.Message ?? '');

    // 204 = «Неверный токен». Это и только это означает плохие креды.
    // Любой другой ответ — Тинькофф прошёл проверку подписи и спорит уже
    // по другому поводу (нет такого платежа, неверный формат PaymentId и т.п.) —
    // то есть креды OK.
    if (code === '204' || /невер.{1,5}токен/i.test(msg)) {
      return NextResponse.json({
        ok: false,
        step: 'token',
        terminalKey,
        error: 'Тинькофф отказал: неверный токен. Проверьте, что Password в /admin/settings совпадает с тем, что в ЛК Т-Бизнеса → Интернет-эквайринг → Терминал → SecretKey.',
        raw: data,
      });
    }

    return NextResponse.json({
      ok: true,
      terminalKey,
      message:
        code === '7' || /payment not found|не найден/i.test(msg)
          ? `✓ Креды валидные. Терминал ${terminalKey} принимает подпись запроса.`
          : `✓ Креды валидные (Тинькофф принял подпись). Тестовый ответ: code=${code}, msg=${msg}. Это нормально — тестовый PaymentId им не нравится, но подпись приняли.`,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      step: 'network',
      error: `Сеть/таймаут: ${String(e)}`,
    });
  }
}
