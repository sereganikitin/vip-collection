// Strip footer/marketing/JS leftovers that JoomShopping product descriptions
// drag along when scraped: obfuscated email cloaking, ads for the legacy
// store's physical address on Ферганская, phone numbers, Avito promos.
//
// Strategy: descriptions usually have a clear cutover from product text to
// marketing footer. We truncate at the earliest known marker, then strip any
// remaining inline phones/emails.

const FOOTER_MARKERS = [
  'Заказать через Avito',
  'Заказать через AVITO',
  'Самовывоз скидка',
  'Адрес электронной почты защищен',
  'document.getElementById',
  'Маршрут (',
  'м.Рязанский проспект',
  'ул.Ферганская',
  'спортивный магазин "ВКУС победы"',
  'Выбирая VIP COLLECTION, Вы получаете',
  'написать в MAX',
];

const PHONE_RE = /\+?7\s*\(?9\d{2}\)?\s*\d{3}[\s-]?\d{2}[\s-]?\d{2}/g;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function cleanDescription(raw: string): string {
  let s = raw ?? '';

  let cutAt = s.length;
  for (const m of FOOTER_MARKERS) {
    const idx = s.indexOf(m);
    if (idx >= 0 && idx < cutAt) cutAt = idx;
  }
  s = s.slice(0, cutAt);

  s = s.replace(PHONE_RE, '');
  s = s.replace(EMAIL_RE, '');

  // Tidy: collapse whitespace, strip stray punctuation at edges, drop trailing
  // dangling tokens like " - " or " >>>> "
  s = s
    .replace(/\s+/g, ' ')
    .replace(/[>>>]+\s*$/g, '')
    .replace(/[-—–]\s*$/g, '')
    .replace(/^[\s.,;:]+/, '')
    .replace(/[\s.,;:]+$/, '.')
    .trim();

  return s;
}
