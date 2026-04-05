'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, ShoppingCart, FolderOpen, LogOut, Users } from 'lucide-react';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({ products: 0, orders: 0, categories: 0 });

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/admin/login');
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      Promise.all([
        fetch('/api/products?limit=1').then(r => r.json()),
        fetch('/api/orders').then(r => r.json()),
        fetch('/api/categories').then(r => r.json()),
      ]).then(([prod, orders, cats]) => {
        setStats({
          products: prod.total || 0,
          orders: Array.isArray(orders) ? orders.length : 0,
          categories: Array.isArray(cats) ? cats.length : 0,
        });
      }).catch(() => {});
    }
  }, [status]);

  if (status === 'loading' || status === 'unauthenticated') {
    return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="bg-primary text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">VIP COLLECTION</h1>
            <p className="text-sm text-gray-300">Панель администратора</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300">
              <Users size={14} className="inline mr-1" />
              {session?.user?.name}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/admin/login' })}
              className="flex items-center gap-1 text-sm text-gray-300 hover:text-white transition-colors"
            >
              <LogOut size={16} />
              Выйти
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          <Link href="/admin" className="px-4 py-3 text-sm font-medium text-accent border-b-2 border-accent whitespace-nowrap">
            Дашборд
          </Link>
          <Link href="/admin/products" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text transition-colors whitespace-nowrap">
            Товары
          </Link>
          <Link href="/admin/categories" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text transition-colors whitespace-nowrap">
            Категории
          </Link>
          <Link href="/admin/brands" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text transition-colors whitespace-nowrap">
            Бренды
          </Link>
          <Link href="/admin/orders" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text transition-colors whitespace-nowrap">
            Заказы
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Дашборд</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <Link href="/admin/products" className="bg-surface rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                <Package size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.products}</p>
                <p className="text-sm text-text-muted">Товаров</p>
              </div>
            </div>
          </Link>
          <Link href="/admin/orders" className="bg-surface rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
                <ShoppingCart size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.orders}</p>
                <p className="text-sm text-text-muted">Заказов</p>
              </div>
            </div>
          </Link>
          <div className="bg-surface rounded-xl border border-border p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                <FolderOpen size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.categories}</p>
                <p className="text-sm text-text-muted">Категорий</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-3">Быстрые действия</h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/products/new" className="px-4 py-2 bg-accent text-primary font-medium rounded-lg hover:bg-accent-hover transition-colors text-sm">
              + Добавить товар
            </Link>
            <Link href="/admin/orders" className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-light transition-colors text-sm">
              Посмотреть заказы
            </Link>
            <Link href="/" target="_blank" className="px-4 py-2 border border-border font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm">
              Открыть сайт
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
