'use client';

import Link from 'next/link';
import { ShoppingBag, Phone, Mail, Search, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { categories } from '@/data/categories';

const SHORT_NAMES: Record<string, string> = {
  'suitcases': 'Чемоданы',
  'women-bags': 'Женские сумки',
  'briefcases': 'Портфели',
  'parts': 'Запчасти',
  'wallets': 'Портмоне',
  'backpacks': 'Рюкзаки',
  'covers': 'Чехлы',
  'belts': 'Ремни',
  'waist-bags': 'Поясные сумки',
  'misc': 'Разное',
  'sale': 'РАСПРОДАЖА',
};

export default function Header() {
  const { totalItems } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="sticky top-0 z-50 bg-surface shadow-sm">
      {/* Top bar */}
      <div className="bg-primary text-white">
        <div className="mx-auto max-w-7xl px-4 py-2 flex items-center justify-between text-sm">
          <div className="hidden sm:flex items-center gap-6">
            <a href="tel:+79175741130" className="flex items-center gap-1.5 hover:text-accent transition-colors">
              <Phone size={14} />
              +7 (917) 574-11-30
            </a>
            <a href="mailto:vipcoll@mail.ru" className="flex items-center gap-1.5 hover:text-accent transition-colors">
              <Mail size={14} />
              vipcoll@mail.ru
            </a>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/about" className="hover:text-accent transition-colors">О компании</Link>
            <Link href="/dostavka" className="hover:text-accent transition-colors">Доставка</Link>
            <Link href="/contacts" className="hover:text-accent transition-colors">Контакты</Link>
          </nav>
        </div>
      </div>

      {/* Main header */}
      <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between gap-4">
        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Меню"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold tracking-wide text-primary">VIP</span>
            <span className="text-xs tracking-[0.3em] text-accent font-semibold -mt-1">COLLECTION</span>
          </div>
        </Link>

        {/* Search */}
        <div className="hidden md:flex flex-1 max-w-xl mx-8">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Поиск товаров..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-12 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-accent transition-colors">
              <Search size={20} />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Поиск"
          >
            <Search size={22} />
          </button>
          <Link
            href="/cart"
            className="relative flex items-center gap-2 px-4 py-2.5 bg-accent text-primary rounded-lg hover:bg-accent-hover transition-colors font-medium"
          >
            <ShoppingBag size={20} />
            <span className="hidden sm:inline">Корзина</span>
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-danger text-white text-xs rounded-full flex items-center justify-center font-bold">
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile search */}
      {searchOpen && (
        <div className="md:hidden px-4 pb-3">
          <input
            type="text"
            placeholder="Поиск товаров..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent"
            autoFocus
          />
        </div>
      )}

      {/* Desktop navigation */}
      <nav className="hidden lg:block border-t border-border">
        <div className="mx-auto max-w-7xl px-4">
          <ul className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={`/catalog/${cat.slug}`}
                  title={cat.name}
                  className={`block px-2.5 py-3 text-sm font-medium hover:text-accent transition-colors whitespace-nowrap ${
                    cat.id === 'sale' ? 'text-danger font-bold' : 'text-text'
                  }`}
                >
                  {SHORT_NAMES[cat.id] ?? cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-surface">
          <nav className="px-4 py-2">
            <ul className="divide-y divide-border">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/catalog/${cat.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block py-3 text-sm font-medium hover:text-accent transition-colors ${
                      cat.id === 'sale' ? 'text-danger font-bold' : ''
                    }`}
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
              <li className="sm:hidden">
                <a href="tel:+79175741130" className="block py-3 text-sm text-text-muted">
                  +7 (917) 574-11-30
                </a>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
