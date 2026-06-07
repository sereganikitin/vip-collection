'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export interface AdminCounters {
  ordersNew: number;
  feedbackUnread: number;
  wholesaleUnread: number;
}

type Key =
  | 'dashboard' | 'products' | 'categories' | 'brands'
  | 'orders'    | 'feedback' | 'wholesale-requests'
  | 'pages'     | 'banners'  | 'settings';

const ZERO: AdminCounters = { ordersNew: 0, feedbackUnread: 0, wholesaleUnread: 0 };

/**
 * Хук для подгрузки счётчиков. Опрашивает /api/admin/counters раз в 30с,
 * чтобы новые заказы/обращения подсвечивались без перезагрузки страницы.
 */
export function useAdminCounters(): AdminCounters {
  const [c, setC] = useState<AdminCounters>(ZERO);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await fetch('/api/admin/counters', { cache: 'no-store' });
        if (!r.ok) return;
        const data = await r.json();
        if (!alive) return;
        setC({
          ordersNew: Number(data.ordersNew) || 0,
          feedbackUnread: Number(data.feedbackUnread) || 0,
          wholesaleUnread: Number(data.wholesaleUnread) || 0,
        });
      } catch {}
    }
    load();
    const id = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return c;
}

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[10px] font-bold bg-danger text-white rounded-full align-middle">
      {n > 99 ? '99+' : n}
    </span>
  );
}

interface NavLinkProps {
  href: string;
  label: string;
  active: boolean;
  count?: number;
}

function NavLink({ href, label, active, count }: NavLinkProps) {
  const base = 'px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors flex items-center';
  const tone = active
    ? 'text-accent border-b-2 border-accent'
    : 'text-text-muted hover:text-text';
  return (
    <Link href={href} className={`${base} ${tone}`}>
      {label}
      {count !== undefined && <Badge n={count} />}
    </Link>
  );
}

/**
 * Общая навигация админки. Каждая страница использует <AdminNav current="..." />
 * вместо собственного скопированного блока ссылок. Счётчики непрочитанных
 * подгружаются автоматически и показываются как красные бейджи.
 */
export default function AdminNav({ current }: { current: Key }) {
  const counters = useAdminCounters();
  return (
    <nav className="bg-surface border-b border-border">
      <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
        <NavLink href="/admin" label="Дашборд" active={current === 'dashboard'} />
        <NavLink href="/admin/products" label="Товары" active={current === 'products'} />
        <NavLink href="/admin/categories" label="Категории" active={current === 'categories'} />
        <NavLink href="/admin/brands" label="Бренды" active={current === 'brands'} />
        <NavLink href="/admin/orders" label="Заказы" active={current === 'orders'} count={counters.ordersNew} />
        <NavLink href="/admin/feedback" label="Обращения" active={current === 'feedback'} count={counters.feedbackUnread} />
        <NavLink href="/admin/wholesale-requests" label="Опт" active={current === 'wholesale-requests'} count={counters.wholesaleUnread} />
        <NavLink href="/admin/pages" label="Страницы" active={current === 'pages'} />
        <NavLink href="/admin/banners" label="Баннеры" active={current === 'banners'} />
        <NavLink href="/admin/settings" label="Настройки" active={current === 'settings'} />
      </div>
    </nav>
  );
}
