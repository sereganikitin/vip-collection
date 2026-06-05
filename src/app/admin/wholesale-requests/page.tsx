'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  LogOut, ArrowLeft, Check, Trash2, Phone, Clock, Mail, MapPin, Building2,
} from 'lucide-react';

interface WholesaleRequest {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  email: string | null;
  city: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

type FilterKey = 'all' | 'unread';

export default function AdminWholesaleRequests() {
  const { status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<WholesaleRequest[]>([]);
  const [unread, setUnread] = useState(0);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async (f: FilterKey) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/wholesale-requests?filter=${f}`);
      const data = await res.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
      setUnread(Number(data?.unread ?? 0));
      setTotal(Number(data?.total ?? 0));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/admin/login');
    if (status === 'authenticated') fetchItems(filter);
  }, [status, router, fetchItems, filter]);

  async function markRead(id: string, isRead: boolean) {
    await fetch(`/api/wholesale-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead }),
    });
    fetchItems(filter);
  }

  async function remove(id: string) {
    if (!confirm('Удалить эту заявку? Действие нельзя отменить.')) return;
    await fetch(`/api/wholesale-requests/${id}`, { method: 'DELETE' });
    fetchItems(filter);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

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
          <Link href="/admin/wholesale-requests" className="px-4 py-3 text-sm font-medium text-accent border-b-2 border-accent whitespace-nowrap">
            Опт{unread > 0 ? ` · ${unread}` : ''}
          </Link>
          <Link href="/admin/pages" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Страницы</Link>
          <Link href="/admin/banners" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Баннеры</Link>
          <Link href="/admin/settings" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Настройки</Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-text-muted hover:text-text"><ArrowLeft size={20} /></Link>
          <h2 className="text-2xl font-bold">Заявки от оптовиков</h2>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {(
            [
              { k: 'all',    label: `Все · ${total}` },
              { k: 'unread', label: `Непрочитанные · ${unread}` },
            ] as const
          ).map((f) => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                filter === f.k
                  ? 'bg-accent text-primary border-accent font-medium'
                  : 'border-border text-text-muted hover:border-accent hover:text-text'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-surface border border-border rounded-xl p-10 text-center text-text-muted">
            Загрузка…
          </div>
        ) : items.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-10 text-center">
            <Building2 size={32} className="mx-auto text-text-muted mb-3" />
            <p className="text-text-muted">
              {filter === 'unread' ? 'Все заявки прочитаны.' : 'Пока нет заявок от оптовиков.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((w) => (
              <div
                key={w.id}
                className={`bg-surface rounded-xl border p-5 ${
                  w.isRead ? 'border-border' : 'border-accent/40 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Building2 size={16} className="text-accent" />
                      <h3 className="font-semibold">{w.companyName}</h3>
                      {!w.isRead && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-accent/10 text-accent rounded">
                          новая
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-muted ml-6 mb-1">Контакт: {w.name}</p>
                    <div className="flex items-center gap-3 text-sm text-text-muted ml-6 flex-wrap">
                      <a href={`tel:${w.phone}`} className="flex items-center gap-1 hover:text-accent transition-colors">
                        <Phone size={13} /> {w.phone}
                      </a>
                      <a href={`https://wa.me/${w.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-xs hover:text-accent transition-colors">
                        WhatsApp
                      </a>
                      {w.email && (
                        <a href={`mailto:${w.email}`} className="flex items-center gap-1 text-xs hover:text-accent transition-colors">
                          <Mail size={12} /> {w.email}
                        </a>
                      )}
                      {w.city && (
                        <span className="flex items-center gap-1 text-xs">
                          <MapPin size={12} /> {w.city}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs">
                        <Clock size={12} /> {formatDate(w.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {w.isRead ? (
                      <button
                        onClick={() => markRead(w.id, false)}
                        className="px-3 py-1.5 text-xs border border-border text-text-muted rounded-lg hover:border-accent hover:text-accent transition-colors"
                      >
                        Отметить как новую
                      </button>
                    ) : (
                      <button
                        onClick={() => markRead(w.id, true)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-success text-success rounded-lg hover:bg-success/5 transition-colors"
                      >
                        <Check size={12} /> Прочитано
                      </button>
                    )}
                    <button
                      onClick={() => remove(w.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-border text-danger rounded-lg hover:bg-danger/5 hover:border-danger transition-colors"
                      aria-label="Удалить"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <p className="text-sm leading-relaxed whitespace-pre-wrap text-text mt-3 pt-3 border-t border-border">
                  {w.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
