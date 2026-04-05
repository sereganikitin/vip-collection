'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Pencil, Trash2, LogOut, ArrowLeft, Save, X, Eye, EyeOff } from 'lucide-react';

interface Banner {
  id: string;
  image: string;
  sortOrder: number;
  isActive: boolean;
  title: string | null;
  link: string | null;
}

const emptyForm = { image: '', sortOrder: 0, isActive: true, title: '', link: '' };

export default function AdminBanners() {
  const { status } = useSession();
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchBanners = useCallback(async () => {
    const res = await fetch('/api/banners?all=true');
    const data = await res.json();
    setBanners(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/admin/login');
    if (status === 'authenticated') fetchBanners();
  }, [status, router, fetchBanners]);

  function startEdit(banner: Banner) {
    setEditId(banner.id);
    setShowNew(false);
    setForm({ image: banner.image, sortOrder: banner.sortOrder, isActive: banner.isActive, title: banner.title || '', link: banner.link || '' });
  }

  function cancel() {
    setEditId(null);
    setShowNew(false);
    setForm(emptyForm);
  }

  async function handleSave() {
    setSaving(true);
    const body = { image: form.image, sortOrder: Number(form.sortOrder), isActive: form.isActive, title: form.title || null, link: form.link || null };

    if (editId) {
      await fetch(`/api/banners/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      await fetch('/api/banners', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    setSaving(false);
    cancel();
    fetchBanners();
  }

  async function handleDelete(id: string) {
    if (!confirm('Удалить баннер?')) return;
    await fetch(`/api/banners/${id}`, { method: 'DELETE' });
    fetchBanners();
  }

  async function toggleActive(banner: Banner) {
    await fetch(`/api/banners/${banner.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !banner.isActive }),
    });
    fetchBanners();
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
          <Link href="/admin/banners" className="px-4 py-3 text-sm font-medium text-accent border-b-2 border-accent whitespace-nowrap">Баннеры</Link>
          <Link href="/admin/settings" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Настройки</Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-text-muted hover:text-text"><ArrowLeft size={20} /></Link>
            <h2 className="text-2xl font-bold">Баннеры слайдера ({banners.length})</h2>
          </div>
          <button onClick={() => { setShowNew(true); setEditId(null); setForm(emptyForm); }}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-primary font-medium rounded-lg hover:bg-accent-hover transition-colors">
            <Plus size={18} /> Добавить
          </button>
        </div>

        {/* New banner form */}
        {showNew && (
          <div className="bg-surface rounded-xl border border-border p-5 mb-6">
            <h3 className="font-semibold mb-4">Новый баннер</h3>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Путь к изображению *</label>
                <input type="text" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })}
                  placeholder="/images/banners/banner-1.jpg"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Заголовок</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ссылка</label>
                <input type="text" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })}
                  placeholder="/catalog/chemodany"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Порядок</label>
                <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent text-sm" />
              </div>
              <div className="flex items-end pb-0.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-accent" />
                  <span className="text-sm">Активен</span>
                </label>
              </div>
            </div>
            {form.image && (
              <div className="mb-4 rounded-lg overflow-hidden border border-border">
                <div className="relative aspect-[21/7] bg-gray-100">
                  <Image src={form.image} alt="Preview" fill className="object-cover" sizes="600px" />
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving || !form.image}
                className="flex items-center gap-1 px-4 py-2 bg-accent text-primary font-medium rounded-lg hover:bg-accent-hover text-sm disabled:opacity-50">
                <Save size={16} /> {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button onClick={cancel} className="flex items-center gap-1 px-4 py-2 border border-border rounded-lg hover:bg-gray-50 text-sm">
                <X size={16} /> Отмена
              </button>
            </div>
          </div>
        )}

        {loading ? <p className="text-text-muted">Загрузка...</p> : banners.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border p-12 text-center">
            <p className="text-text-muted mb-4">Баннеров пока нет</p>
            <button onClick={() => { setShowNew(true); setForm(emptyForm); }}
              className="text-accent hover:underline text-sm">Добавить первый баннер</button>
          </div>
        ) : (
          <div className="space-y-4">
            {banners.map((banner) => (
              editId === banner.id ? (
                <div key={banner.id} className="bg-surface rounded-xl border border-accent p-5">
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium mb-1">Путь к изображению</label>
                      <input type="text" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Заголовок</label>
                      <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Ссылка</label>
                      <input type="text" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Порядок</label>
                      <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
                    </div>
                    <div className="flex items-end pb-0.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-accent" />
                        <span className="text-sm">Активен</span>
                      </label>
                    </div>
                  </div>
                  {form.image && (
                    <div className="mb-4 rounded-lg overflow-hidden border border-border">
                      <div className="relative aspect-[21/7] bg-gray-100">
                        <Image src={form.image} alt="Preview" fill className="object-cover" sizes="600px" />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={handleSave} disabled={saving}
                      className="flex items-center gap-1 px-3 py-1.5 bg-accent text-primary font-medium rounded-lg text-sm disabled:opacity-50">
                      <Save size={14} /> Сохранить
                    </button>
                    <button onClick={cancel} className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-sm">
                      <X size={14} /> Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <div key={banner.id} className={`bg-surface rounded-xl border border-border overflow-hidden ${!banner.isActive ? 'opacity-60' : ''}`}>
                  <div className="relative aspect-[21/5] bg-gray-100">
                    <Image src={banner.image} alt={banner.title || 'Баннер'} fill className="object-cover" sizes="800px" />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="px-2 py-1 bg-black/60 text-white text-xs rounded-md">#{banner.sortOrder}</span>
                      {!banner.isActive && <span className="px-2 py-1 bg-red-600 text-white text-xs rounded-md">Скрыт</span>}
                    </div>
                    <div className="absolute top-3 right-3 flex gap-1">
                      <button onClick={() => toggleActive(banner)}
                        className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors" title={banner.isActive ? 'Скрыть' : 'Показать'}>
                        {banner.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button onClick={() => startEdit(banner)}
                        className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(banner.id)}
                        className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors text-danger">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {(banner.title || banner.link) && (
                    <div className="px-4 py-2 text-sm text-text-muted">
                      {banner.title && <span className="font-medium mr-4">{banner.title}</span>}
                      {banner.link && <span className="font-mono text-xs">{banner.link}</span>}
                    </div>
                  )}
                </div>
              )
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
