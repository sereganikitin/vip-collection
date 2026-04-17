'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { SlidersHorizontal, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { products } from '@/data/products';
import { categories } from '@/data/categories';
import ProductCard from '@/components/ProductCard';

type SortOption = 'default' | 'price-asc' | 'price-desc' | 'name';

const PER_PAGE = 12;

export default function CatalogContent({ slug }: { slug: string }) {
  const [sort, setSort] = useState<SortOption>('default');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const category = categories.find((c) => c.slug === slug);
  const categoryName = category?.name || 'Каталог';

  const filteredProducts = useMemo(() => {
    const result = category
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

  const totalPages = Math.ceil(filteredProducts.length / PER_PAGE);
  const safeCurrentPage = Math.min(page, totalPages || 1);
  const paginatedProducts = filteredProducts.slice(
    (safeCurrentPage - 1) * PER_PAGE,
    safeCurrentPage * PER_PAGE
  );

  const handleSort = (value: SortOption) => {
    setSort(value);
    setPage(1);
  };

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goToPage(p: number) {
    setPage(p);
    scrollToTop();
  }

  function getPageNumbers(): (number | '...')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (safeCurrentPage > 3) pages.push('...');
    const start = Math.max(2, safeCurrentPage - 1);
    const end = Math.min(totalPages - 1, safeCurrentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (safeCurrentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link href="/" className="hover:text-accent transition-colors">Главная</Link>
        <ChevronRight size={14} />
        <span className="text-text font-medium">{categoryName}</span>
      </nav>

      <div className="flex gap-8">
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

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{categoryName}</h1>
              <p className="text-sm text-text-muted mt-1">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'товар' : filteredProducts.length < 5 ? 'товара' : 'товаров'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                <SlidersHorizontal size={16} /> Фильтры
              </button>
              <select
                value={sort}
                onChange={(e) => handleSort(e.target.value as SortOption)}
                className="px-4 py-2 border border-border rounded-lg text-sm bg-surface focus:outline-none focus:border-accent"
              >
                <option value="default">По умолчанию</option>
                <option value="price-asc">Сначала дешевле</option>
                <option value="price-desc">Сначала дороже</option>
                <option value="name">По названию</option>
              </select>
            </div>
          </div>

          {paginatedProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {paginatedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 mt-8">
                  <button
                    onClick={() => goToPage(1)}
                    disabled={safeCurrentPage === 1}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-border hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Первая страница"
                  >
                    <ChevronsLeft size={16} />
                  </button>
                  <button
                    onClick={() => goToPage(safeCurrentPage - 1)}
                    disabled={safeCurrentPage === 1}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-border hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Предыдущая"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {getPageNumbers().map((p, i) =>
                    p === '...' ? (
                      <span key={`dots-${i}`} className="w-9 h-9 flex items-center justify-center text-text-muted text-sm">
                        ...
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => goToPage(p)}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                          p === safeCurrentPage
                            ? 'bg-accent text-primary'
                            : 'border border-border hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => goToPage(safeCurrentPage + 1)}
                    disabled={safeCurrentPage === totalPages}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-border hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Следующая"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => goToPage(totalPages)}
                    disabled={safeCurrentPage === totalPages}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-border hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Последняя страница"
                  >
                    <ChevronsRight size={16} />
                  </button>
                </div>
              )}

              {totalPages > 1 && (
                <p className="text-center text-sm text-text-muted mt-3">
                  Страница {safeCurrentPage} из {totalPages}
                </p>
              )}
            </>
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
