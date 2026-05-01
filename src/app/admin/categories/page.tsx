'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Pencil, Trash2, LogOut, ArrowLeft, Save, X } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';

interface Category {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  sortOrder: number;
  isActive: boolean;
  _count: { products: number };
}

const emptyForm = { name: '', slug: '', image: '', sortOrder: 0, isActive: true };

export default function AdminCategories() {
  const { status } = useSession();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    const res = await fetch('/api/categories?all=true');
    const data = await res.json();
    setCategories(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/admin/login');
    if (status === 'authenticated') fetchCategories();
  }, [status, router, fetchCategories]);

  function generateSlug(name: string) {
    const map: Record<string, string> = {
      'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z','и':'i',
      'й':'j','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t',
      'у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y',
      'ь':'','э':'e','ю':'yu','я':'ya',' ':'-'
    };
    return name.toLowerCase().split('').map(c => map[c] ?? c).join('').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  function startEdit(cat: Category) {
    setEditId(cat.id);
    setShowNew(false);
    setForm({ name: cat.name, slug: cat.slug, image: cat.image || '', sortOrder: cat.sortOrder, isActive: cat.isActive });
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
    const body = { name: form.name, slug: form.slug, image: form.image || null, sortOrder: Number(form.sortOrder), isActive: form.isActive };

    if (editId) {
      await fetch(`/api/categories/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    setSaving(false);
    cancel();
    fetchCategories();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Удалить категорию "${name}"?`)) return;
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Ошибка');
      return;
    }
    fetchCategories();
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
          <Link href="/admin/categories" className="px-4 py-3 text-sm font-medium text-accent border-b-2 border-accent whitespace-nowrap">Категории</Link>
          <Link href="/admin/brands" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Бренды</Link>
          <Link href="/admin/orders" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Заказы</Link>
          <Link href="/admin/banners" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Баннеры</Link>
          <Link href="/admin/settings" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Настройки</Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-text-muted hover:text-text"><ArrowLeft size={20} /></Link>
            <h2 className="text-2xl font-bold">Категории ({categories.length})</h2>
          </div>
          <button onClick={startNew} className="flex items-center gap-2 px-4 py-2 bg-accent text-primary font-medium rounded-lg hover:bg-accent-hover transition-colors">
            <Plus size={18} /> Добавить
          </button>
        </div>

        {/* New category form */}
        {showNew && (
          <div className="bg-surface rounded-xl border border-border p-5 mb-6">
            <h3 className="font-semibold mb-4">Новая категория</h3>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Название *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: generateSlug(e.target.value) })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slug *</label>
                <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent text-sm font-mono" />
              </div>
              <div className="sm:col-span-2">
                <ImageUpload
                  label="Изображение категории"
                  value={form.image}
                  onChange={(url) => setForm({ ...form, image: url })}
                  folder="categories"
                  hint="Рекомендуем квадратное изображение от 600×600 px"
                />
              </div>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Порядок</label>
                  <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent text-sm" />
                </div>
                <label className="flex items-center gap-2 pb-2 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-accent" />
                  <span className="text-sm">Активна</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving || !form.name || !form.slug} className="flex items-center gap-1 px-4 py-2 bg-accent text-primary font-medium rounded-lg hover:bg-accent-hover text-sm disabled:opacity-50">
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
                  <th className="text-left px-4 py-3 font-medium text-text-muted">Фото</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted">Название</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted">Slug</th>
                  <th className="text-center px-4 py-3 font-medium text-text-muted">Порядок</th>
                  <th className="text-center px-4 py-3 font-medium text-text-muted">Товаров</th>
                  <th className="text-center px-4 py-3 font-medium text-text-muted">Статус</th>
                  <th className="text-right px-4 py-3 font-medium text-text-muted">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categories.map((cat) => (
                  editId === cat.id ? (
                    <tr key={cat.id} className="bg-accent/5">
                      <td className="px-4 py-3" colSpan={7}>
                        <div className="grid sm:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-medium mb-1">Название</label>
                            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Slug</label>
                            <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                              className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-accent" />
                          </div>
                          <div className="sm:col-span-2">
                            <ImageUpload
                              label="Изображение"
                              value={form.image}
                              onChange={(url) => setForm({ ...form, image: url })}
                              folder="categories"
                            />
                          </div>
                          <div className="flex gap-4 items-end">
                            <div className="flex-1">
                              <label className="block text-xs font-medium mb-1">Порядок</label>
                              <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
                            </div>
                            <label className="flex items-center gap-2 pb-2 cursor-pointer">
                              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-accent" />
                              <span className="text-sm">Активна</span>
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
                    <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="w-10 h-10 relative rounded overflow-hidden bg-gray-100">
                          {cat.image && <Image src={cat.image} alt="" fill className="object-cover" sizes="40px" unoptimized={cat.image.startsWith('/uploads/')} />}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{cat.name}</td>
                      <td className="px-4 py-3 text-text-muted font-mono text-xs">{cat.slug}</td>
                      <td className="px-4 py-3 text-center text-text-muted">{cat.sortOrder}</td>
                      <td className="px-4 py-3 text-center text-text-muted">{cat._count.products}</td>
                      <td className="px-4 py-3 text-center">
                        {cat.isActive
                          ? <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Активна</span>
                          : <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Скрыта</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => startEdit(cat)} className="p-1.5 text-text-muted hover:text-accent transition-colors"><Pencil size={16} /></button>
                          <button onClick={() => handleDelete(cat.id, cat.name)} className="p-1.5 text-text-muted hover:text-danger transition-colors"><Trash2 size={16} /></button>
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
