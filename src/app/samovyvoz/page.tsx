import { ChevronRight, MapPin, Phone, Clock } from 'lucide-react';
import Link from 'next/link';

export default function PickupPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link href="/" className="hover:text-accent transition-colors">Главная</Link>
        <ChevronRight size={14} />
        <span className="text-text font-medium">Где купить</span>
      </nav>

      <div className="bg-surface rounded-xl border border-border p-6 md:p-10">
        <h1 className="text-3xl font-bold mb-6">Где купить</h1>

        <p className="text-text-muted leading-relaxed mb-8">
          Вы можете приобрести наши товары в пункте выдачи в Москве или заказать доставку
          по всей России.
        </p>

        <div className="bg-bg rounded-xl p-6 space-y-4">
          <div className="flex gap-3">
            <MapPin size={20} className="text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Адрес</p>
              <p className="text-text-muted text-sm">115088, г. Москва, Сормовский проезд, д. 11, стр. 1</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Phone size={20} className="text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Телефон</p>
              <a href="tel:+79175741130" className="text-text-muted hover:text-accent transition-colors text-sm">
                +7 (917) 574-11-30
              </a>
            </div>
          </div>

          <div className="flex gap-3">
            <Clock size={20} className="text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Режим работы</p>
              <p className="text-text-muted text-sm">Пн–Пт: 10:00 – 18:00</p>
              <p className="text-text-muted text-sm">Самовывоз по предварительной договорённости</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-text-muted mt-6">
          Перед визитом обязательно свяжитесь с нами для подтверждения наличия товара
          и согласования времени.
        </p>
      </div>
    </div>
  );
}
