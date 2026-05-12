import { prisma } from '@/lib/prisma';

// All public-facing contact and legal info lives in DB Setting rows. The
// frontend (Footer, Contacts, Privacy, Terms) and admin UI both read/write
// against these keys. Defaults below act as fallback when a row is absent.

export interface SiteContacts {
  phone: string;            // tel: target, digits with +
  phoneDisplay: string;     // human-formatted
  email: string;
  telegramUrl: string;
  telegramUsername: string;
  whatsappUrl: string;
  addressFull: string;
  addressShort: string;
  postalCode: string;
  city: string;
  hours: string;
  // Legal entity
  legalName: string;        // e.g. "ИП Никитин С.В."
  legalFullName: string;    // e.g. "Никитин Сергей Владимирович"
  inn: string;
  ogrnip: string;
  legalAddress: string;
}

export const DEFAULT_CONTACTS: SiteContacts = {
  phone: '+79257437135',
  phoneDisplay: '+7 (925) 743-71-35',
  email: 'vipcoll@mail.ru',
  telegramUrl: 'https://t.me/VIP_CHEMODAN',
  telegramUsername: '@VIP_CHEMODAN',
  whatsappUrl: 'https://wa.me/79257437135',
  addressFull: '115088, г. Москва, Сормовский проезд, д. 11, стр. 1',
  addressShort: 'Москва, Сормовский пр-д, 11, стр. 1',
  postalCode: '115088',
  city: 'Москва',
  hours: 'Пн–Пт 10:00–18:00, по предварительной договорённости',
  legalName: 'ИП Никитин С.В.',
  legalFullName: 'Никитин Сергей Владимирович',
  inn: '',
  ogrnip: '',
  legalAddress: '',
};

const KEY_MAP: Record<keyof SiteContacts, string> = {
  phone: 'contact_phone',
  phoneDisplay: 'contact_phone_display',
  email: 'contact_email',
  telegramUrl: 'contact_telegram_url',
  telegramUsername: 'contact_telegram_username',
  whatsappUrl: 'contact_whatsapp_url',
  addressFull: 'contact_address_full',
  addressShort: 'contact_address_short',
  postalCode: 'contact_postal_code',
  city: 'contact_city',
  hours: 'contact_hours',
  legalName: 'legal_name',
  legalFullName: 'legal_full_name',
  inn: 'legal_inn',
  ogrnip: 'legal_ogrnip',
  legalAddress: 'legal_address',
};

export async function getSiteContacts(): Promise<SiteContacts> {
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: Object.values(KEY_MAP) } },
    });
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    const result = { ...DEFAULT_CONTACTS };
    for (const [field, key] of Object.entries(KEY_MAP) as [keyof SiteContacts, string][]) {
      const v = byKey.get(key);
      if (v != null && v.trim() !== '') result[field] = v;
    }
    return result;
  } catch (e) {
    console.error('getSiteContacts: DB error, using defaults', e);
    return { ...DEFAULT_CONTACTS };
  }
}

// Translate flat string-only key/value bag (from API/admin form) to typed contacts.
export function contactsFromKv(kv: Record<string, string>): SiteContacts {
  const r = { ...DEFAULT_CONTACTS };
  for (const [field, key] of Object.entries(KEY_MAP) as [keyof SiteContacts, string][]) {
    const v = kv[key];
    if (v != null && v.trim() !== '') r[field] = v;
  }
  return r;
}

export function contactsKeys(): readonly string[] {
  return Object.values(KEY_MAP);
}
