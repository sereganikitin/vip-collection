import Link from 'next/link';
import { Phone, Mail, MapPin, Send } from 'lucide-react';
import type { SiteContacts } from '@/lib/settings';

export default function Footer({ contacts }: { contacts: SiteContacts }) {
  return (
    <footer className="bg-primary text-white mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company */}
          <div>
            <div className="mb-4">
              <span className="text-2xl font-bold">VIP</span>
              <span className="text-accent text-xs tracking-[0.3em] font-semibold ml-1">COLLECTION</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Интернет-магазин кожгалантереи, чемоданов и аксессуаров для путешествий.
              Собственные бренды и лучшие мировые производители.
            </p>
            {contacts.telegramUrl && (
              <div className="flex gap-3">
                <a
                  href={contacts.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
                  aria-label="Telegram"
                >
                  <Send size={16} />
                </a>
              </div>
            )}
          </div>

          {/* Catalog */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Каталог</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/catalog/suitcases" className="hover:text-accent transition-colors">Чемоданы</Link></li>
              <li><Link href="/catalog/women-bags" className="hover:text-accent transition-colors">Сумки женские</Link></li>
              <li><Link href="/catalog/briefcases" className="hover:text-accent transition-colors">Портфели</Link></li>
              <li><Link href="/catalog/backpacks" className="hover:text-accent transition-colors">Рюкзаки</Link></li>
              <li><Link href="/catalog/wallets" className="hover:text-accent transition-colors">Портмоне</Link></li>
              <li><Link href="/catalog/sale" className="hover:text-accent transition-colors text-danger font-medium">Распродажа</Link></li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Информация</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/about" className="hover:text-accent transition-colors">О компании</Link></li>
              <li><Link href="/delivery" className="hover:text-accent transition-colors">Доставка</Link></li>
              <li><Link href="/wholesale" className="hover:text-accent transition-colors">Оптовикам</Link></li>
              <li><Link href="/repair" className="hover:text-accent transition-colors">Ремонт</Link></li>
              <li><Link href="/pickup" className="hover:text-accent transition-colors">Где купить</Link></li>
              <li><Link href="/privacy" className="hover:text-accent transition-colors">Политика конфиденциальности</Link></li>
              <li><Link href="/terms" className="hover:text-accent transition-colors">Договор-оферта</Link></li>
            </ul>
          </div>

          {/* Contacts */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Контакты</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <Phone size={16} className="mt-0.5 flex-shrink-0 text-accent" />
                <div>
                  <a href={`tel:${contacts.phone}`} className="hover:text-accent transition-colors">{contacts.phoneDisplay}</a>
                  <p className="text-xs text-gray-500">WhatsApp / Telegram</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Mail size={16} className="mt-0.5 flex-shrink-0 text-accent" />
                <a href={`mailto:${contacts.email}`} className="hover:text-accent transition-colors">{contacts.email}</a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 flex-shrink-0 text-accent" />
                <span>{contacts.addressFull}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} VIP COLLECTION. Все права защищены.</p>
          <p>
            {contacts.legalName}
            {contacts.inn && ` · ИНН ${contacts.inn}`}
            {contacts.ogrnip && ` · ОГРНИП ${contacts.ogrnip}`}
          </p>
        </div>
      </div>
    </footer>
  );
}
