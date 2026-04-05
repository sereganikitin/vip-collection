'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Pencil, Trash2, LogOut, ArrowLeft, Save, X } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  logo: string | null;
  isActive: boolean;
  _count: { products: number };
}

const emptyForm = { name: '', logo: '', isActive: true };

export default function AdminBrands() {
  const { status } = useSession();
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchBrands = useCallback(async () => {
    const res = await fetch('/api/brands');
    const data = await res.json();
    setBrands(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/admin/login');
    if (status === 'authenticated') fetchBrands();
  }, [status, router, fetchBrands]);

  function startEdit(brand: Brand) {
    setEditId(brand.id);
    setShowNew(false);
    setForm({ name: brand.name, logo: brand.logo || '', isActive: brand.isActive });
  }

  function startNew() {
    setEditId(null);
    setShowNew(true);
    setForm(emptyForm);
  }

  function cancel() {
    setEditId(null);
    setShowNew(false);
    setForm(emptyForm);
  }

  async function handleSave() {
    setSaving(true);
    const body = { name: form.name, logo: form.logo || null, isActive: form.isActive };

    if (editId) {
      await fetch(`/api/brands/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      await fetch('/api/brands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    setSaving(false);
    cancel();
    fetchBrands();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Удалить бренд "${name}"?`)) return;
    const res = await fetch(`/api/brands/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Ошибка');
      return;
    }
    fetchBrands();
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
          <Link href="/admin/brands" className="px-4 py-3 text-sm font-medium text-accent border-b-2 border-accent whitespace-nowrap">Бренды</Link>
          <Link href="/admin/orders" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Заказы</Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-text-muted hover:text-text"><ArrowLeft size={20} /></Link>
            <h2 className="text-2xl font-bold">Бренды ({brands.length})</h2>
          </div>
          <button onClick={startNew} className="flex items-center gap-2 px-4 py-2 bg-accent text-primary font-medium rounded-lg hover:bg-accent-hover transition-colors">
            <Plus size={18} /> Добавить
          </button>
        </div>

        {/* New brand form */}
        {showNew && (
          <div className="bg-surface rounded-xl border border-border p-5 mb-6">
            <h3 className="font-semibold mb-4">Новый бренд</h3>
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Название *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Логотип</label>
                <input type="text" value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} placeholder="/images/brands/..."
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent text-sm" />
              </div>
              <div className="flex items-end pb-0.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-accent" />
                  <span className="text-sm">Активен</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving || !form.name} className="flex items-center gap-1 px-4 py-2 bg-accent text-primary font-medium rounded-lg hover:bg-accent-hover text-sm disabled:opacity-50">
                <Save size={16} /> {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button onClick={cancel} className="flex items-center gap-1 px-4 py-2 border border-border rounded-lg hover:bg-gray-50 text-sm">
                <X size={16} /> Отмена
              </button>
            </div>
          </div>
        )}

        {loading ? <p className="text-text-muted">Загрузка...</p> : (
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-text-muted">Лого</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted">Название</th>
                  <th className="text-center px-4 py-3 font-medium text-text-muted">Товаров</th>
                  <th className="text-center px-4 py-3 font-medium text-text-muted">Статус</th>
                  <th className="text-right px-4 py-3 font-medium text-text-muted">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {brands.map((brand) => (
                  editId === brand.id ? (
                    <tr key={brand.id} className="bg-accent/5">
                      <td className="px-4 py-3" colSpan={5}>
                        <div className="grid sm:grid-cols-3 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-medium mb-1">Название</label>
                            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Логотип</label>
                            <input type="text" value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })}
                              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
                          </div>
                          <div className="flex items-end pb-0.5">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-accent" />
                              <span className="text-sm">Активен</span>
                            </label>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 bg-accent text-primary font-medium rounded-lg text-sm disabled:opacity-50">
                            <Save size={14} /> Сохранить
                          </button>
                          <button onClick={cancel} className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-sm">
                            <X size={14} /> Отмена
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={brand.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="w-16 h-10 relative rounded overflow-hidden bg-gray-100">
                          {brand.logo && <Image src={brand.logo} alt="" fill className="object-contain p-1" sizes="64px" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{brand.name}</td>
                      <td className="px-4 py-3 text-center text-text-muted">{brand._count.products}</td>
                      <td className="px-4 py-3 text-center">
                        {brand.isActive
                          ? <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Активен</span>
                          : <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Скрыт</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => startEdit(brand)} className="p-1.5 text-text-muted hover:text-accent transition-colors"><Pencil size={16} /></button>
                          <button onClick={() => handleDelete(brand.id, brand.name)} className="p-1.5 text-text-muted hover:text-danger transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
