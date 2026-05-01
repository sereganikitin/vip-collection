'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Pencil, Trash2, LogOut, ArrowLeft } from 'lucide-react';
import { signOut } from 'next-auth/react';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  inStock: boolean;
  isNew: boolean;
  isSale: boolean;
  isActive: boolean;
  category: { name: string };
  brand: { name: string };
}

export default function AdminProducts() {
  const { status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    const res = await fetch('/api/products?limit=200');
    const data = await res.json();
    setProducts(data.products || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/admin/login');
    if (status === 'authenticated') fetchProducts();
  }, [status, router, fetchProducts]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Удалить товар "${name}"?`)) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    fetchProducts();
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
  }

  if (status !== 'authenticated') {
    return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;
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
          <Link href="/admin/products" className="px-4 py-3 text-sm font-medium text-accent border-b-2 border-accent whitespace-nowrap">Товары</Link>
          <Link href="/admin/categories" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Категории</Link>
          <Link href="/admin/brands" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Бренды</Link>
          <Link href="/admin/orders" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Заказы</Link>
          <Link href="/admin/banners" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Баннеры</Link>
          <Link href="/admin/settings" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Настройки</Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-text-muted hover:text-text"><ArrowLeft size={20} /></Link>
            <h2 className="text-2xl font-bold">Товары ({total})</h2>
          </div>
          <Link href="/admin/products/new" className="flex items-center gap-2 px-4 py-2 bg-accent text-primary font-medium rounded-lg hover:bg-accent-hover transition-colors">
            <Plus size={18} /> Добавить
          </Link>
        </div>

        {loading ? (
          <p className="text-text-muted">Загрузка...</p>
        ) : (
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-text-muted">Фото</th>
                    <th className="text-left px-4 py-3 font-medium text-text-muted">Название</th>
                    <th className="text-left px-4 py-3 font-medium text-text-muted">Категория</th>
                    <th className="text-left px-4 py-3 font-medium text-text-muted">Бренд</th>
                    <th className="text-right px-4 py-3 font-medium text-text-muted">Цена</th>
                    <th className="text-center px-4 py-3 font-medium text-text-muted">Статус</th>
                    <th className="text-right px-4 py-3 font-medium text-text-muted">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="w-12 h-12 relative rounded overflow-hidden bg-gray-100">
                          {product.images[0] && (
                            <Image src={product.images[0]} alt="" fill className="object-contain p-0.5" sizes="48px" unoptimized={product.images[0]?.startsWith('/uploads/')} />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium line-clamp-1">{product.name}</p>
                      </td>
                      <td className="px-4 py-3 text-text-muted">{product.category.name}</td>
                      <td className="px-4 py-3 text-text-muted">{product.brand.name}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatPrice(product.price)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {product.inStock ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">В наличии</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Нет</span>
                          )}
                          {product.isNew && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">NEW</span>}
                          {product.isSale && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">SALE</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/products/${product.id}`} className="p-1.5 text-text-muted hover:text-accent transition-colors">
                            <Pencil size={16} />
                          </Link>
                          <button onClick={() => handleDelete(product.id, product.name)} className="p-1.5 text-text-muted hover:text-danger transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
