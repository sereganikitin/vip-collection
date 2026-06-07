'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, ShoppingCart, FolderOpen, LogOut, Users, Bell, MessageSquare, Briefcase } from 'lucide-react';
import AdminNav, { useAdminCounters } from '@/components/admin/AdminNav';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({ products: 0, orders: 0, categories: 0 });
  const counters = useAdminCounters();
  const totalUnread = counters.ordersNew + counters.feedbackUnread + counters.wholesaleUnread;

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

      <AdminNav current="dashboard" />

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Дашборд</h2>
          {totalUnread > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-danger/10 text-danger rounded-lg text-sm font-medium">
              <Bell size={16} />
              {totalUnread} новых {totalUnread === 1 ? 'уведомление' : totalUnread < 5 ? 'уведомления' : 'уведомлений'}
            </div>
          )}
        </div>

        {/* Карточки непрочитанных: видны крупно сверху, со ссылками */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Link
            href="/admin/orders"
            className={`rounded-xl border p-5 transition-all ${
              counters.ordersNew > 0
                ? 'border-danger bg-danger/5 hover:bg-danger/10 shadow-sm'
                : 'border-border bg-surface hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                counters.ordersNew > 0 ? 'bg-danger text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                <ShoppingCart size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold">{counters.ordersNew}</p>
                <p className="text-sm text-text-muted">Новых заказов</p>
              </div>
            </div>
          </Link>
          <Link
            href="/admin/feedback"
            className={`rounded-xl border p-5 transition-all ${
              counters.feedbackUnread > 0
                ? 'border-danger bg-danger/5 hover:bg-danger/10 shadow-sm'
                : 'border-border bg-surface hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                counters.feedbackUnread > 0 ? 'bg-danger text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                <MessageSquare size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold">{counters.feedbackUnread}</p>
                <p className="text-sm text-text-muted">Непрочитанных обращений</p>
              </div>
            </div>
          </Link>
          <Link
            href="/admin/wholesale-requests"
            className={`rounded-xl border p-5 transition-all ${
              counters.wholesaleUnread > 0
                ? 'border-danger bg-danger/5 hover:bg-danger/10 shadow-sm'
                : 'border-border bg-surface hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                counters.wholesaleUnread > 0 ? 'bg-danger text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                <Briefcase size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold">{counters.wholesaleUnread}</p>
                <p className="text-sm text-text-muted">Новых оптовых заявок</p>
              </div>
            </div>
          </Link>
        </div>

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
