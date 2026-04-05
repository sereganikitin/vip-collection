'use client';

import { use, useState, useMemo } from 'react';
import Link from 'next/link';
import { SlidersHorizontal, ChevronRight } from 'lucide-react';
import { products } from '@/data/products';
import { categories } from '@/data/categories';
import ProductCard from '@/components/ProductCard';

type SortOption = 'default' | 'price-asc' | 'price-desc' | 'name';

export default function CatalogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [sort, setSort] = useState<SortOption>('default');
  const [showFilters, setShowFilters] = useState(false);

  const category = categories.find((c) => c.slug === slug);
  const categoryName = category?.name || 'Каталог';

  const filteredProducts = useMemo(() => {
    let result = category
      ? products.filter((p) => p.categoryId === category.id)
      : products;

    switch (sort) {
      case 'price-asc':
        return [...result].sort((a, b) => a.price - b.price);
      case 'price-desc':
        return [...result].sort((a, b) => b.price - a.price);
      case 'name':
        return [...result].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      default:
        return result;
    }
  }, [category, sort]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link href="/" className="hover:text-accent transition-colors">Главная</Link>
        <ChevronRight size={14} />
        <span className="text-text font-medium">{categoryName}</span>
      </nav>

      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className={`${showFilters ? 'block' : 'hidden'} lg:block w-64 flex-shrink-0`}>
          <div className="bg-surface rounded-xl border border-border p-5 sticky top-28">
            <h3 className="font-semibold text-lg mb-4">Категории</h3>
            <ul className="space-y-1">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/catalog/${cat.slug}`}
                    className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                      cat.slug === slug
                        ? 'bg-accent/10 text-accent font-medium'
                        : 'hover:bg-gray-50 text-text-muted hover:text-text'
                    } ${cat.id === 'sale' ? 'text-danger font-medium' : ''}`}
                  >
                    {cat.name}
                    <span className="text-xs ml-1 opacity-60">({cat.productCount})</span>
                  </Link>
                </li>
              ))}
            </ul>

            <hr className="my-5 border-border" />

            <h3 className="font-semibold text-lg mb-4">Информация</h3>
            <ul className="space-y-1 text-sm">
              <li><Link href="/dostavka" className="block px-3 py-2 rounded-lg text-text-muted hover:bg-gray-50 hover:text-text transition-colors">Доставка</Link></li>
              <li><Link href="/remont" className="block px-3 py-2 rounded-lg text-text-muted hover:bg-gray-50 hover:text-text transition-colors">Ремонт</Link></li>
              <li><Link href="/optovikam" className="block px-3 py-2 rounded-lg text-text-muted hover:bg-gray-50 hover:text-text transition-colors">Оптовикам</Link></li>
            </ul>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl md:text-3xl font-bold">{categoryName}</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                <SlidersHorizontal size={16} /> Фильтры
              </button>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="px-4 py-2 border border-border rounded-lg text-sm bg-surface focus:outline-none focus:border-accent"
              >
                <option value="default">По умолчанию</option>
                <option value="price-asc">Сначала дешевле</option>
                <option value="price-desc">Сначала дороже</option>
                <option value="name">По названию</option>
              </select>
            </div>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-text-muted text-lg">Товары в данной категории скоро появятся</p>
              <Link href="/" className="text-accent font-medium hover:underline mt-4 inline-block">
                Вернуться на главную
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
