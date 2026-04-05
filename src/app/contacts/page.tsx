import { ChevronRight, Phone, Mail, MapPin, Send, Clock } from 'lucide-react';
import Link from 'next/link';

export default function ContactsPage() {
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
              <a href="tel:+79175741130" className="text-text-muted hover:text-accent transition-colors">
                +7 (917) 574-11-30
              </a>
              <p className="text-xs text-text-muted mt-1">WhatsApp / Telegram</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Mail size={20} className="text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Email</p>
              <a href="mailto:vipcoll@mail.ru" className="text-text-muted hover:text-accent transition-colors">
                vipcoll@mail.ru
              </a>
            </div>
          </div>

          <div className="flex gap-3">
            <Send size={20} className="text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Telegram</p>
              <a href="https://t.me/VIP_CHEMODAN" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-accent transition-colors">
                @VIP_CHEMODAN
              </a>
            </div>
          </div>

          <div className="flex gap-3">
            <MapPin size={20} className="text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Адрес</p>
              <p className="text-text-muted text-sm">115088, г. Москва, Сормовский пр-д, д. 11, стр. 1</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Clock size={20} className="text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Режим работы</p>
              <p className="text-text-muted text-sm">Пн–Пт: 10:00 – 18:00</p>
              <p className="text-text-muted text-sm">Сб–Вс: по договорённости</p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-6">
          <h2 className="font-semibold text-lg mb-4">Написать нам</h2>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Имя</label>
              <input type="text" className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input type="email" className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Сообщение</label>
              <textarea rows={4} className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none" />
            </div>
            <button type="submit" className="w-full py-3 bg-accent text-primary font-semibold rounded-lg hover:bg-accent-hover transition-colors">
              Отправить
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
