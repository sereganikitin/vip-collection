import Link from 'next/link';
import { Phone, Mail, MapPin, Send } from 'lucide-react';

export default function Footer() {
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
            <div className="flex gap-3">
              <a
                href="https://t.me/VIP_CHEMODAN"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
                aria-label="Telegram"
              >
                <Send size={16} />
              </a>
            </div>
          </div>

          {/* Catalog */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Каталог</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/catalog/chemodany" className="hover:text-accent transition-colors">Чемоданы</Link></li>
              <li><Link href="/catalog/sumki-zhenskie" className="hover:text-accent transition-colors">Сумки женские</Link></li>
              <li><Link href="/catalog/portfeli" className="hover:text-accent transition-colors">Портфели</Link></li>
              <li><Link href="/catalog/ryukzaki" className="hover:text-accent transition-colors">Рюкзаки</Link></li>
              <li><Link href="/catalog/portmone" className="hover:text-accent transition-colors">Портмоне</Link></li>
              <li><Link href="/catalog/rasprodazha" className="hover:text-accent transition-colors text-danger font-medium">Распродажа</Link></li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Информация</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/about" className="hover:text-accent transition-colors">О компании</Link></li>
              <li><Link href="/dostavka" className="hover:text-accent transition-colors">Доставка</Link></li>
              <li><Link href="/optovikam" className="hover:text-accent transition-colors">Оптовикам</Link></li>
              <li><Link href="/remont" className="hover:text-accent transition-colors">Ремонт</Link></li>
              <li><Link href="/samovyvoz" className="hover:text-accent transition-colors">Где купить</Link></li>
            </ul>
          </div>

          {/* Contacts */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Контакты</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <Phone size={16} className="mt-0.5 flex-shrink-0 text-accent" />
                <div>
                  <a href="tel:+79175741130" className="hover:text-accent transition-colors">+7 (917) 574-11-30</a>
                  <p className="text-xs text-gray-500">WhatsApp / Telegram</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Mail size={16} className="mt-0.5 flex-shrink-0 text-accent" />
                <a href="mailto:vipcoll@mail.ru" className="hover:text-accent transition-colors">vipcoll@mail.ru</a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 flex-shrink-0 text-accent" />
                <span>115088, Москва, Сормовский пр-д, 11, стр. 1</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} VIP COLLECTION. Все права защищены.</p>
          <p>ИП Исмагилов К.Я.</p>
        </div>
      </div>
    </footer>
  );
}
