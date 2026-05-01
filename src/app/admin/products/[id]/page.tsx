'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';

interface Category { id: string; name: string; }
interface Brand { id: string; name: string; }

export default function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isNew = id === 'new';
  const { status } = useSession();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', slug: '', price: 0, oldPrice: 0,
    images: [''], description: '', categoryId: '', brandId: '',
    inStock: true, isNew: false, isSale: false, isActive: true,
    specs: '{}',
  });

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/admin/login');
  }, [status, router]);

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories);
    fetch('/api/products?limit=1').then(r => r.json()).then(data => {
      if (data.products?.[0]) {
        const uniqueBrands = new Map<string, Brand>();
        data.products.forEach((p: { brand: Brand }) => uniqueBrands.set(p.brand.id, p.brand));
        setBrands(Array.from(uniqueBrands.values()));
      }
    });
    // Fetch all products to get brands list
    fetch('/api/products?limit=200').then(r => r.json()).then(data => {
      if (data.products) {
        const uniqueBrands = new Map<string, Brand>();
        data.products.forEach((p: { brand: Brand }) => uniqueBrands.set(p.brand.id, p.brand));
        setBrands(Array.from(uniqueBrands.values()));
      }
    });
  }, []);

  useEffect(() => {
    if (!isNew && status === 'authenticated') {
      fetch(`/api/products/${id}`).then(r => r.json()).then(p => {
        if (p.id) {
          setForm({
            name: p.name, slug: p.slug, price: p.price, oldPrice: p.oldPrice || 0,
            images: p.images.length ? p.images : [''], description: p.description || '',
            categoryId: p.categoryId, brandId: p.brandId,
            inStock: p.inStock, isNew: p.isNew, isSale: p.isSale, isActive: p.isActive,
            specs: JSON.stringify(p.specs, null, 2),
          });
        }
      });
    }
  }, [id, isNew, status]);

  function updateField(field: string, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function generateSlug(name: string) {
    const map: Record<string, string> = {
      'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z','и':'i',
      'й':'j','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t',
      'у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y',
      'ь':'','э':'e','ю':'yu','я':'ya',' ':'-','"':'','.':'-',"'":''
    };
    return name.toLowerCase().split('').map(c => map[c] ?? c).join('').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const body = {
      name: form.name,
      slug: form.slug,
      price: Number(form.price),
      oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
      images: form.images.filter(Boolean),
      description: form.description,
      categoryId: form.categoryId,
      brandId: form.brandId,
      inStock: form.inStock,
      isNew: form.isNew,
      isSale: form.isSale,
      isActive: form.isActive,
      specs: JSON.parse(form.specs || '{}'),
    };

    const url = isNew ? '/api/products' : `/api/products/${id}`;
    const method = isNew ? 'POST' : 'PUT';

    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

    if (res.ok) {
      router.push('/admin/products');
    } else {
      const err = await res.json();
      alert('Ошибка: ' + (err.error || 'Неизвестная ошибка'));
      setSaving(false);
    }
  }

  if (status !== 'authenticated') {
    return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-primary text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">VIP COLLECTION</h1>
          <p className="text-sm text-gray-300">Панель администратора</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/products" className="text-text-muted hover:text-text"><ArrowLeft size={20} /></Link>
          <h2 className="text-2xl font-bold">{isNew ? 'Новый товар' : 'Редактирование товара'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">Название *</label>
            <input
              type="text" required value={form.name}
              onChange={(e) => { updateField('name', e.target.value); if (isNew) updateField('slug', generateSlug(e.target.value)); }}
              className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">URL (slug) *</label>
            <input
              type="text" required value={form.slug}
              onChange={(e) => updateField('slug', e.target.value)}
              className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Категория *</label>
              <select
                required value={form.categoryId}
                onChange={(e) => updateField('categoryId', e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent"
              >
                <option value="">Выберите...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Бренд *</label>
              <select
                required value={form.brandId}
                onChange={(e) => updateField('brandId', e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent"
              >
                <option value="">Выберите...</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Цена *</label>
              <input
                type="number" required min="0" step="0.01" value={form.price}
                onChange={(e) => updateField('price', e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Старая цена</label>
              <input
                type="number" min="0" step="0.01" value={form.oldPrice || ''}
                onChange={(e) => updateField('oldPrice', e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Изображения товара</label>
            <p className="text-xs text-text-muted mb-3">Первое изображение — главное. Остальные показываются в галерее.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {form.images.map((img, i) => (
                <div key={i} className="relative">
                  <ImageUpload
                    value={img}
                    onChange={(url) => { const imgs = [...form.images]; imgs[i] = url; updateField('images', imgs); }}
                    folder="products"
                    label={i === 0 ? 'Главное фото' : `Дополнительное фото ${i}`}
                  />
                  {form.images.length > 1 && (
                    <button
                      type="button"
                      onClick={() => updateField('images', form.images.filter((_, j) => j !== i))}
                      className="absolute -top-1 right-0 flex items-center gap-1 text-xs text-danger hover:underline"
                    >
                      <Trash2 size={12} /> удалить
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => updateField('images', [...form.images, ''])}
              className="mt-3 text-sm text-accent hover:underline"
            >
              + Добавить ещё изображение
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Описание</label>
            <textarea
              value={form.description} rows={3}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Характеристики (JSON)</label>
            <textarea
              value={form.specs} rows={4}
              onChange={(e) => updateField('specs', e.target.value)}
              className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent font-mono text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-6">
            {[
              { key: 'inStock', label: 'В наличии' },
              { key: 'isNew', label: 'Новинка' },
              { key: 'isSale', label: 'Распродажа' },
              { key: 'isActive', label: 'Активен' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form[key as keyof typeof form] as boolean}
                  onChange={(e) => updateField(key, e.target.checked)}
                  className="w-4 h-4 rounded border-border accent-accent"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-accent text-primary font-semibold rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50">
              <Save size={18} /> {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <Link href="/admin/products" className="px-6 py-2.5 border border-border rounded-lg hover:bg-gray-50 transition-colors">
              Отмена
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
