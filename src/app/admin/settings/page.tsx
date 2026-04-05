'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogOut, ArrowLeft, Save, CheckCircle } from 'lucide-react';

export default function AdminSettings() {
  const { status } = useSession();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    admin_email: 'k959em177@gmail.com',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/admin/login');
    if (status === 'authenticated') {
      fetch('/api/settings').then(r => r.json()).then(data => {
        if (data && !data.error) {
          setForm(prev => ({ ...prev, ...data }));
        }
      });
    }
  }, [status, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (status !== 'authenticated') {
    return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-primary text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div><h1 className="text-xl font-bold">VIP COLLECTION</h1><p className="text-sm text-gray-300">Панель администратора</p></div>
          <button onClick={() => signOut({ callbackUrl: '/admin/login' })} className="flex items-center gap-1 text-sm text-gray-300 hover:text-white"><LogOut size={16} /> Выйти</button>
        </div>
      </header>

      <nav className="bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          <Link href="/admin" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Дашборд</Link>
          <Link href="/admin/products" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Товары</Link>
          <Link href="/admin/categories" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Категории</Link>
          <Link href="/admin/brands" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Бренды</Link>
          <Link href="/admin/orders" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Заказы</Link>
          <Link href="/admin/banners" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Баннеры</Link>
          <Link href="/admin/settings" className="px-4 py-3 text-sm font-medium text-accent border-b-2 border-accent whitespace-nowrap">Настройки</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-text-muted hover:text-text"><ArrowLeft size={20} /></Link>
          <h2 className="text-2xl font-bold">Настройки</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Admin Email */}
          <div className="bg-surface rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-4">Уведомления о заказах</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Email для уведомлений *</label>
              <input type="email" required value={form.admin_email}
                onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent text-sm" />
              <p className="text-xs text-text-muted mt-1">На этот адрес будут приходить уведомления о новых заказах</p>
            </div>
          </div>

          {/* SMTP Settings */}
          <div className="bg-surface rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-4">Настройки почты (SMTP)</h3>
            <p className="text-sm text-text-muted mb-4">
              Для отправки уведомлений нужно указать SMTP-сервер. Можно использовать Gmail, Yandex, Mail.ru и др.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">SMTP-сервер</label>
                <input type="text" value={form.smtp_host} placeholder="smtp.gmail.com"
                  onChange={(e) => setForm({ ...form, smtp_host: e.target.value })}
                  className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Порт</label>
                <input type="text" value={form.smtp_port} placeholder="587"
                  onChange={(e) => setForm({ ...form, smtp_port: e.target.value })}
                  className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Логин (email)</label>
                <input type="text" value={form.smtp_user} placeholder="your@gmail.com"
                  onChange={(e) => setForm({ ...form, smtp_user: e.target.value })}
                  className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Пароль приложения</label>
                <input type="password" value={form.smtp_pass}
                  onChange={(e) => setForm({ ...form, smtp_pass: e.target.value })}
                  className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Адрес отправителя</label>
                <input type="email" value={form.smtp_from} placeholder="noreply@vip-collection.ru"
                  onChange={(e) => setForm({ ...form, smtp_from: e.target.value })}
                  className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent text-sm" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-accent text-primary font-semibold rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50">
              <Save size={18} /> {saving ? 'Сохранение...' : 'Сохранить настройки'}
            </button>
            {saved && (
              <span className="flex items-center gap-1 text-success text-sm font-medium">
                <CheckCircle size={16} /> Сохранено
              </span>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
