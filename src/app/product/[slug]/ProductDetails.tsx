'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, ShoppingBag, Truck, Shield, RotateCcw, Check } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import ProductCard from '@/components/ProductCard';
import type { CategoryView } from '@/lib/categories';
import type { ProductView } from '@/lib/products';
import { enrichProductDescription } from '@/lib/product-enrich';

function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
}

interface ProductDetailsProps {
  slug: string;
  product: ProductView | null;
  category: CategoryView | null;
  relatedProducts: ProductView[];
}

export default function ProductDetails({ product, category, relatedProducts }: ProductDetailsProps) {
  const { addItem, items } = useCart();
  const enriched = product ? enrichProductDescription(product, category?.name ?? null) : null;

  // На каждый клик показываем зелёную «✓ Добавлено в корзину» на ~1.5с,
  // потом возвращаемся к исходному виду. Параллельно показываем сколько
  // штук уже в корзине, чтобы было видно, что повторные клики работают.
  const [flash, setFlash] = useState(false);
  const inCartCount = product ? (items.find((i) => i.product.id === product.id)?.quantity ?? 0) : 0;

  function handleAddToCart() {
    if (!product) return;
    addItem(product);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 1500);
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Товар не найден</h1>
        <Link href="/" className="text-accent hover:underline">Вернуться на главную</Link>
      </div>
    );
  }

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

          <p className="text-text-muted leading-relaxed mb-6">{enriched?.base ?? product.description}</p>

          <button
            onClick={handleAddToCart}
            disabled={!product.inStock}
            aria-live="polite"
            className={`relative w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-2 overflow-hidden ${
              flash
                ? 'bg-success text-white scale-[1.02]'
                : 'bg-accent text-primary hover:bg-accent-hover active:scale-95'
            }`}
          >
            {flash ? (
              <>
                <Check size={20} className="animate-bounce" />
                Добавлено в корзину
              </>
            ) : (
              <>
                <ShoppingBag size={20} />
                {inCartCount > 0 ? `В корзине · ${inCartCount}. Добавить ещё` : 'Добавить в корзину'}
              </>
            )}
          </button>
          {inCartCount > 0 && !flash && (
            <p className="text-xs text-text-muted mb-8">
              <Link href="/cart" className="text-accent hover:underline">Перейти в корзину →</Link>
            </p>
          )}
          {!inCartCount && <div className="mb-8" />}

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
              { icon: Truck, title: 'Доставка', desc: 'Москва и область' },
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

      {/* Расширенное описание — для SEO и AI-цитирования */}
      {enriched && enriched.extra.length > 0 && (
        <section className="mb-12 bg-surface rounded-2xl border border-border p-6 md:p-8">
          <h2 className="text-xl md:text-2xl font-bold mb-4">О товаре</h2>
          <div className="space-y-3 text-text-muted leading-relaxed text-sm md:text-base">
            {enriched.extra.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </section>
      )}

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
