'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, Plus, Minus, Check } from 'lucide-react';
import { Product } from '@/types';
import { useCart } from '@/context/CartContext';

function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
}

export default function ProductCard({ product }: { product: Product }) {
  const { items, addItem, updateQuantity } = useCart();

  const cartItem = items.find((i) => i.product.id === product.id);
  const quantity = cartItem?.quantity || 0;

  return (
    <div className="group bg-surface rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300">
      <Link href={`/product/${product.slug}`} className="block relative aspect-square bg-gray-100 overflow-hidden">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          unoptimized={product.images[0]?.startsWith('/uploads/')}
        />
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.isNew && (
            <span className="px-2.5 py-1 bg-success text-white text-xs font-bold rounded-md">NEW</span>
          )}
          {product.isSale && (
            <span className="px-2.5 py-1 bg-danger text-white text-xs font-bold rounded-md">SALE</span>
          )}
        </div>
      </Link>
      <div className="p-4">
        <p className="text-xs text-text-muted font-medium uppercase tracking-wide mb-1">{product.brand}</p>
        <Link href={`/product/${product.slug}`}>
          <h3 className="text-sm font-medium leading-snug mb-3 line-clamp-2 group-hover:text-accent transition-colors">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-end justify-between gap-2">
          <div>
            <span className="text-lg font-bold text-primary">{formatPrice(product.price)}</span>
            {product.oldPrice && (
              <span className="block text-sm text-text-muted line-through">{formatPrice(product.oldPrice)}</span>
            )}
          </div>
          {quantity === 0 ? (
            <button
              onClick={() => addItem(product)}
              className="p-2.5 bg-accent text-primary rounded-lg hover:bg-accent-hover transition-colors"
              aria-label="Добавить в корзину"
            >
              <ShoppingBag size={18} />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateQuantity(product.id, quantity - 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-text"
                aria-label="Уменьшить"
              >
                <Minus size={14} />
              </button>
              <span className="w-8 text-center text-sm font-bold text-primary">{quantity}</span>
              <button
                onClick={() => addItem(product)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-accent hover:bg-accent-hover transition-colors text-primary"
                aria-label="Увеличить"
              >
                <Plus size={14} />
              </button>
              <Link
                href="/cart"
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-success text-white ml-0.5"
                aria-label="В корзину"
              >
                <Check size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
