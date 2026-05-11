import type { Metadata } from 'next';
import { ChevronRight, Phone, Mail, MapPin, Send, Clock, FileText } from 'lucide-react';
import Link from 'next/link';
import { INDEXABLE_ROBOTS } from '@/lib/seo';
import { getSiteContacts } from '@/lib/settings';

export const metadata: Metadata = {
  robots: INDEXABLE_ROBOTS,
  title: 'Контакты VIP COLLECTION — телефон, адрес, режим работы',
  description:
    'Контактные данные интернет-магазина VIP COLLECTION в Москве. Адрес: Сормовский проезд, 11, стр. 1. Телефон, email, Telegram, режим работы.',
  keywords: ['VIP COLLECTION контакты', 'магазин чемоданов Москва', 'Сормовский проезд 11', 'телефон магазина'],
  alternates: { canonical: 'https://vipcoll.ru/contacts' },
  openGraph: {
    title: 'Контакты VIP COLLECTION',
    description: 'Москва, Сормовский проезд 11. WhatsApp, Telegram, email.',
    url: 'https://vipcoll.ru/contacts',
    type: 'website',
    locale: 'ru_RU',
  },
};

export default async function ContactsPage() {
  const c = await getSiteContacts();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link href="/" className="hover:text-accent transition-colors">Главная</Link>
        <ChevronRight size={14} />
        <span className="text-text font-medium">Контакты</span>
      </nav>

      <h1 className="text-3xl font-bold mb-8">Контакты</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-surface rounded-xl border border-border p-6 space-y-5">
          <div className="flex gap-3">
            <Phone size={20} className="text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Телефон</p>
              <a href={`tel:${c.phone}`} className="text-text-muted hover:text-accent transition-colors">
                {c.phoneDisplay}
              </a>
              <p className="text-xs text-text-muted mt-1">WhatsApp / Telegram</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Mail size={20} className="text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Email</p>
              <a href={`mailto:${c.email}`} className="text-text-muted hover:text-accent transition-colors">
                {c.email}
              </a>
            </div>
          </div>

          {c.telegramUrl && (
            <div className="flex gap-3">
              <Send size={20} className="text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Telegram</p>
                <a href={c.telegramUrl} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-accent transition-colors">
                  {c.telegramUsername || c.telegramUrl}
                </a>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <MapPin size={20} className="text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Адрес</p>
              <p className="text-text-muted text-sm">{c.addressFull}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Clock size={20} className="text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Режим работы</p>
              <p className="text-text-muted text-sm">{c.hours}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface rounded-xl border border-border p-6">
            <h2 className="font-semibold text-lg mb-4">Реквизиты продавца</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Юр. наименование</dt>
                <dd className="font-medium text-right">{c.legalName}</dd>
              </div>
              {c.legalFullName && (
                <div className="flex justify-between gap-3">
                  <dt className="text-text-muted">ФИО</dt>
                  <dd className="font-medium text-right">{c.legalFullName}</dd>
                </div>
              )}
              {c.inn && (
                <div className="flex justify-between gap-3">
                  <dt className="text-text-muted">ИНН</dt>
                  <dd className="font-mono text-right">{c.inn}</dd>
                </div>
              )}
              {c.ogrnip && (
                <div className="flex justify-between gap-3">
                  <dt className="text-text-muted">ОГРНИП</dt>
                  <dd className="font-mono text-right">{c.ogrnip}</dd>
                </div>
              )}
              {c.legalAddress && (
                <div className="flex justify-between gap-3">
                  <dt className="text-text-muted">Юр. адрес</dt>
                  <dd className="text-right">{c.legalAddress}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="bg-surface rounded-xl border border-border p-6">
            <h2 className="font-semibold text-lg mb-4">Документы</h2>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <FileText size={16} className="text-accent" />
                <Link href="/privacy" className="text-text-muted hover:text-accent transition-colors">
                  Политика обработки персональных данных
                </Link>
              </li>
              <li className="flex items-center gap-2">
                <FileText size={16} className="text-accent" />
                <Link href="/terms" className="text-text-muted hover:text-accent transition-colors">
                  Договор-оферта на продажу товаров
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
