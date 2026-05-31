import type { Metadata } from 'next';
import Link from 'next/link';
import { Home, Search, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Страница не найдена — VIP COLLECTION',
  description:
    'Запрашиваемая страница не найдена. Перейдите на главную или в каталог чемоданов VIP COLLECTION в Москве.',
  robots: { index: false, follow: true },
};

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-center">
      <p className="text-7xl md:text-8xl font-bold text-accent mb-4">404</p>
      <h1 className="text-2xl md:text-3xl font-bold mb-3">Страница не найдена</h1>
      <p className="text-text-muted leading-relaxed mb-8">
        Возможно, страница была удалена или вы перешли по неактуальной ссылке.
        Попробуйте найти нужный товар через каталог или вернитесь на главную.
      </p>

      <div className="flex flex-wrap justify-center gap-3 mb-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-3 bg-accent text-primary font-semibold rounded-lg hover:bg-accent-hover transition-colors text-sm"
        >
          <Home size={16} />
          На главную
        </Link>
        <Link
          href="/catalog/suitcases"
          className="inline-flex items-center gap-2 px-5 py-3 bg-surface border border-border font-semibold rounded-lg hover:border-accent hover:text-accent transition-colors text-sm"
        >
          <Search size={16} />
          Каталог чемоданов
        </Link>
      </div>

      <div className="text-left bg-surface border border-border rounded-2xl p-6 md:p-8">
        <h2 className="text-lg font-bold mb-4">Популярные разделы</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { href: '/catalog/suitcases', label: 'Чемоданы VIP COLLECTION' },
            { href: '/catalog/women-bags', label: 'Сумки женские David Jones' },
            { href: '/catalog/wallets', label: 'Кожгалантерея NERI KARRA' },
            { href: '/catalog/backpacks', label: 'Рюкзаки для ноутбука' },
            { href: '/catalog/parts', label: 'Запчасти для чемоданов' },
            { href: '/catalog/sale', label: 'Распродажа' },
            { href: '/blog', label: 'Блог и гайды' },
            { href: '/repair', label: 'Ремонт чемоданов' },
            { href: '/delivery', label: 'Доставка по Москве' },
            { href: '/contacts', label: 'Контакты' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between text-sm text-text-muted hover:text-accent transition-colors py-2 border-b border-border/50 last:border-b-0"
            >
              <span>{item.label}</span>
              <ArrowRight size={14} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
