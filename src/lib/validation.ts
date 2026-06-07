// Валидация телефонов и email.
// Используется и на клиенте (синхронный formatPhoneMask + validate*),
// и на сервере (асинхронный checkEmailDomainExists с DNS-проверкой).

// ──────────────────────────────────────────────────────────────
// Телефон
// ──────────────────────────────────────────────────────────────

/**
 * Возвращает только цифры из строки телефона.
 * Используется и для маски при наборе, и для валидации.
 */
export function phoneDigits(input: string): string {
  return input.replace(/\D/g, '');
}

/**
 * Нормализует ввод к 10 цифрам российского мобильного без кода страны.
 * Принимает «+7 925 743-71-35», «8 925 743 71 35», «9257437135» и т.п.
 *
 * Ключевой момент для маски: при каждом нажатии onChange получает строку,
 * в которой УЖЕ есть префикс «+7 (» из предыдущего рендера маски. Поэтому
 * мы должны всегда снимать ОДНО ведущее «7» или «8», независимо от длины —
 * иначе при наборе второго символа цифра «7» из маски прицепляется как
 * первая цифра номера, и всё разъезжается.
 */
function normalizeToLocal10(raw: string): string {
  let d = phoneDigits(raw);
  if (d.length > 0 && (d[0] === '7' || d[0] === '8')) {
    d = d.slice(1);
  }
  return d.slice(0, 10);
}

/**
 * Форматирует ввод телефона в маску +7 (___) ___-__-__.
 * Подсветка незаполненных позиций «_» в выводе НЕ применяется —
 * вместо этого возвращаем то, что уже набрано, обрезая до 10 цифр.
 * Можно использовать как onChange-обработчик для контролируемого input.
 */
export function formatPhoneMask(input: string): string {
  const d = normalizeToLocal10(input);
  if (d.length === 0) return '';
  let out = '+7 (';
  out += d.slice(0, 3);
  if (d.length >= 3) out += ') ';
  if (d.length >= 4) out += d.slice(3, 6);
  if (d.length >= 7) out += '-' + d.slice(6, 8);
  if (d.length >= 9) out += '-' + d.slice(8, 10);
  return out;
}

export interface PhoneValidation {
  ok: boolean;
  /** Нормализованный номер в формате +7XXXXXXXXXX */
  normalized?: string;
  error?: string;
}

/**
 * Проверяет, что номер — корректный российский мобильный.
 * Правила:
 *   - 10 цифр локальной части после кода страны (СТРОГО, не truncate)
 *   - Локальная часть начинается с 9 (мобильные операторы РФ)
 *   - Не все цифры одинаковые (фильтр явных фейков 9999999999)
 *   - Не последовательность 9876543210 / 1234567890
 *
 * Важно: тут НЕЛЬЗЯ переиспользовать normalizeToLocal10 — она режет
 * длину до 10 для маски, и тогда вход «98999999999999999» (17 цифр)
 * превратится в «9899999999» и пройдёт. Поэтому строгая проверка
 * длины делается отдельно от маски.
 */
export function validateRussianPhone(input: string): PhoneValidation {
  let digits = phoneDigits(input);
  // Снимаем ОДИН ведущий код страны (7/8), только если общая длина даёт
  // ровно 11 цифр — тогда первая это код страны. Любая другая длина
  // означает явно битый ввод (мусор), а не мобильный с кодом страны.
  if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) {
    digits = digits.slice(1);
  }

  if (digits.length === 0) {
    return { ok: false, error: 'Введите номер телефона' };
  }
  if (digits.length < 10) {
    return { ok: false, error: 'Номер слишком короткий — должно быть 10 цифр после +7' };
  }
  if (digits.length > 10) {
    return { ok: false, error: 'Номер слишком длинный — должно быть 10 цифр после +7' };
  }
  if (digits[0] !== '9') {
    return { ok: false, error: 'Российский мобильный начинается с +7 9XX. Проверьте номер.' };
  }
  // Эвристики фейков
  if (/^(\d)\1{9}$/.test(digits)) {
    return { ok: false, error: 'Похоже на тестовый номер — введите настоящий' };
  }
  if (digits === '9876543210' || digits === '9123456789') {
    return { ok: false, error: 'Похоже на тестовый номер — введите настоящий' };
  }
  // Возрастающая/убывающая последовательность подряд (1234567890, 0987654321)
  if (/^0123456789|1234567890|9876543210|0987654321$/.test(digits)) {
    return { ok: false, error: 'Похоже на тестовый номер — введите настоящий' };
  }
  // Слишком мало уникальных цифр (например 9112112112 — 3 уникальных, маловероятно реальный номер)
  const unique = new Set(digits.split('')).size;
  if (unique <= 2) {
    return { ok: false, error: 'Похоже на тестовый номер — введите настоящий' };
  }
  return { ok: true, normalized: '+7' + digits };
}

// ──────────────────────────────────────────────────────────────
// Email
// ──────────────────────────────────────────────────────────────

// Прагматичный регекс: имя@домен.tld. Не покрывает 100% RFC 5322 (там
// сложности с экранированием и комментариями в адресе), но отбрасывает
// 99.9% мусора, которым реально пишут в формы.
const EMAIL_RE =
  /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;

export interface EmailValidation {
  ok: boolean;
  error?: string;
}

export function validateEmailFormat(input: string): EmailValidation {
  const t = input.trim();
  if (t.length === 0) return { ok: false, error: 'Введите email' };
  if (t.length > 254) return { ok: false, error: 'Email слишком длинный' };
  if (!EMAIL_RE.test(t)) {
    return { ok: false, error: 'Введите корректный email (например, name@gmail.com)' };
  }
  // Запрещаем явно фейковые домены
  const domain = t.split('@')[1]?.toLowerCase() ?? '';
  if (
    domain === 'example.com' ||
    domain === 'example.ru' ||
    domain === 'test.com' ||
    domain === 'test.ru' ||
    domain === 'mail.com' // часто это «mail.ru» с опечаткой
  ) {
    return { ok: false, error: 'Этот домен не подходит — введите ваш реальный email' };
  }
  return { ok: true };
}

/**
 * Проверяет, что у домена email есть DNS-запись MX (или хотя бы A).
 * Если MX есть — домен принимает почту. Если нет ни MX, ни A — почта мертва.
 * Используется только на сервере (Node DNS).
 *
 * @returns true если домен похож на живой почтовик, false если точно мёртв,
 *          null если DNS-запрос завис/упал по сети — лучше пропустить (мягкий fallback).
 */
export async function checkEmailDomainExists(email: string): Promise<boolean | null> {
  const domain = email.trim().split('@')[1]?.toLowerCase();
  if (!domain) return false;

  // Динамический import — чтобы lib мог сидеть в общих утилитах,
  // не таща node:dns на клиент при tree-shaking.
  let dns: typeof import('node:dns/promises');
  try {
    dns = await import('node:dns/promises');
  } catch {
    return null; // не на сервере, валидацию не запускаем
  }

  try {
    const mx = await Promise.race([
      dns.resolveMx(domain),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('mx-timeout')), 4000)),
    ]);
    if (Array.isArray(mx) && mx.length > 0) return true;
  } catch (e) {
    const msg = String(e);
    // ENOTFOUND / ENODATA — домена нет
    if (msg.includes('ENOTFOUND') || msg.includes('ENODATA')) {
      // Доп. шанс: некоторые домены принимают почту по A-записи (legacy RFC 5321 §5)
      try {
        const a = await Promise.race([
          dns.resolve4(domain),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error('a-timeout')), 3000)),
        ]);
        return Array.isArray(a) && a.length > 0;
      } catch {
        return false;
      }
    }
    // Прочие ошибки (таймаут, сеть) — софт-фейл, разрешаем
    return null;
  }
  return null;
}
