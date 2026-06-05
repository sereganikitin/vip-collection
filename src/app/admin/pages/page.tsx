'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { LogOut, ArrowLeft, ChevronRight, FileText } from 'lucide-react';
import { EDITABLE_PAGES } from '@/lib/page-defaults';

export default function AdminPagesIndex() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/admin/login');
  }, [status, router]);

  if (status !== 'authenticated') {
    return <div className="min-h-screen flex items-center justify-center">Загрузка…</div>;
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-primary text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">VIP COLLECTION</h1>
            <p className="text-sm text-gray-300">Панель администратора</p>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/admin/login' })} className="flex items-center gap-1 text-sm text-gray-300 hover:text-white">
            <LogOut size={16} /> Выйти
          </button>
        </div>
      </header>

      <nav className="bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          <Link href="/admin" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Дашборд</Link>
          <Link href="/admin/products" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Товары</Link>
          <Link href="/admin/categories" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Категории</Link>
          <Link href="/admin/brands" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Бренды</Link>
          <Link href="/admin/orders" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Заказы</Link>
          <Link href="/admin/feedback" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Обращения</Link>
          <Link href="/admin/wholesale-requests" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Опт</Link>
          <Link href="/admin/pages" className="px-4 py-3 text-sm font-medium text-accent border-b-2 border-accent whitespace-nowrap">Страницы</Link>
          <Link href="/admin/banners" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Баннеры</Link>
          <Link href="/admin/settings" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Настройки</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-text-muted hover:text-text"><ArrowLeft size={20} /></Link>
          <h2 className="text-2xl font-bold">Редактирование страниц сайта</h2>
        </div>

        <p className="text-text-muted text-sm mb-6">
          Здесь можно редактировать тексты статических страниц: заголовки, вводный текст,
          блоки/секции, FAQ. Изменения применяются сразу после сохранения.
        </p>

        <div className="space-y-2">
          {EDITABLE_PAGES.map((p) => (
            <Link
              key={p.slug}
              href={`/admin/pages/${p.slug}`}
              className="flex items-center justify-between bg-surface border border-border rounded-xl px-5 py-4 hover:border-accent hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-accent" />
                <div>
                  <p className="font-semibold">{p.label}</p>
                  <p className="text-xs text-text-muted mt-0.5">/{p.slug}</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-text-muted" />
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
