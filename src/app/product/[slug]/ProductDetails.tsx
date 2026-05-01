'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, ShoppingBag, Truck, Shield, RotateCcw, Check } from 'lucide-react';
import { products } from '@/data/products';
import { categories } from '@/data/categories';
import { useCart } from '@/context/CartContext';
import ProductCard from '@/components/ProductCard';

function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
}

export default function ProductDetails({ slug }: { slug: string }) {
  const { addItem } = useCart();

  const product = products.find((p) => p.slug === slug);

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Товар не найден</h1>
        <Link href="/" className="text-accent hover:underline">Вернуться на главную</Link>
      </div>
    );
  }

  const category = categories.find((c) => c.id === product.categoryId);
  const relatedProducts = products.filter(
    (p) => p.categoryId === product.categoryId && p.id !== product.id
  ).slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6 flex-wrap">
        <Link href="/" className="hover:text-accent transition-colors">Главная</Link>
        <ChevronRight size={14} />
        {category && (
          <>
            <Link href={`/catalog/${category.slug}`} className="hover:text-accent transition-colors">{category.name}</Link>
            <ChevronRight size={14} />
          </>
        )}
        <span className="text-text font-medium">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-8 mb-12">
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="aspect-square relative bg-white">
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="object-contain p-4"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
              unoptimized={product.images[0]?.startsWith('/uploads/')}
            />
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {product.isNew && (
                <span className="px-3 py-1 bg-success text-white text-sm font-bold rounded-md">NEW</span>
              )}
              {product.isSale && (
                <span className="px-3 py-1 bg-danger text-white text-sm font-bold rounded-md">SALE</span>
              )}
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm text-accent font-semibold uppercase tracking-wide mb-2">{product.brand}</p>
          <h1 className="text-2xl md:text-3xl font-bold mb-4">{product.name}</h1>

          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-3xl font-bold text-primary">{formatPrice(product.price)}</span>
            {product.oldPrice && (
              <span className="text-lg text-text-muted line-through">{formatPrice(product.oldPrice)}</span>
            )}
          </div>

          <div className="flex items-center gap-2 mb-6">
            {product.inStock ? (
              <span className="flex items-center gap-1.5 text-success font-medium text-sm">
                <Check size={16} /> В наличии
              </span>
            ) : (
              <span className="text-danger font-medium text-sm">Нет в наличии</span>
            )}
          </div>

          <p className="text-text-muted leading-relaxed mb-6">{product.description}</p>

          <button
            onClick={() => addItem(product)}
            disabled={!product.inStock}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-accent text-primary font-semibold rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-8"
          >
            <ShoppingBag size={20} />
            Добавить в корзину
          </button>

          {Object.keys(product.specs).length > 0 && (
            <div className="mb-8">
              <h3 className="font-semibold text-lg mb-3">Характеристики</h3>
              <dl className="divide-y divide-border">
                {Object.entries(product.specs).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2.5 text-sm">
                    <dt className="text-text-muted">{key}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Truck, title: 'Доставка', desc: 'По всей России' },
              { icon: Shield, title: 'Гарантия', desc: 'Оригинальный товар' },
              { icon: RotateCcw, title: 'Ремонт', desc: 'Сервисный центр' },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-2.5 p-3 bg-bg rounded-lg">
                <item.icon size={18} className="text-accent flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold">{item.title}</p>
                  <p className="text-xs text-text-muted">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-6">Похожие товары</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
