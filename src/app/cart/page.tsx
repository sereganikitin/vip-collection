'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft } from 'lucide-react';
import { useCart } from '@/context/CartContext';

function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <ShoppingBag size={64} className="mx-auto text-gray-300 mb-6" />
        <h1 className="text-2xl font-bold mb-3">Корзина пуста</h1>
        <p className="text-text-muted mb-6">Добавьте товары из каталога</p>
        <Link
          href="/catalog/chemodany"
          className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-primary font-semibold rounded-lg hover:bg-accent-hover transition-colors"
        >
          Перейти в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">Корзина</h1>
        <button
          onClick={clearCart}
          className="text-sm text-text-muted hover:text-danger transition-colors"
        >
          Очистить корзину
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="bg-surface rounded-xl border border-border p-4 flex gap-4">
              <div className="w-24 h-24 bg-white rounded-lg flex-shrink-0 relative overflow-hidden">
                <Image src={product.images[0]} alt={product.name} fill className="object-contain p-1" sizes="96px" unoptimized={product.images[0]?.startsWith('/uploads/')} />
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/product/${product.slug}`} className="font-medium hover:text-accent transition-colors line-clamp-2">
                  {product.name}
                </Link>
                <p className="text-xs text-text-muted mt-1">{product.brand}</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(product.id, quantity - 1)}
                      className="w-8 h-8 border border-border rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center font-medium">{quantity}</span>
                    <button
                      onClick={() => updateQuantity(product.id, quantity + 1)}
                      className="w-8 h-8 border border-border rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold">{formatPrice(product.price * quantity)}</span>
                    <button
                      onClick={() => removeItem(product.id)}
                      className="text-text-muted hover:text-danger transition-colors"
                      aria-label="Удалить"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div>
          <div className="bg-surface rounded-xl border border-border p-6 sticky top-28">
            <h3 className="font-semibold text-lg mb-4">Итого</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Товары ({items.reduce((s, i) => s + i.quantity, 0)} шт.)</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Доставка</span>
                <span className="text-success">Рассчитывается</span>
              </div>
              <hr className="border-border" />
              <div className="flex justify-between text-lg font-bold">
                <span>К оплате</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
            </div>
            <Link
              href="/checkout"
              className="block w-full text-center py-3.5 bg-accent text-primary font-semibold rounded-lg hover:bg-accent-hover transition-colors"
            >
              Оформить заказ
            </Link>
            <Link
              href="/"
              className="flex items-center justify-center gap-2 mt-3 text-sm text-text-muted hover:text-accent transition-colors"
            >
              <ArrowLeft size={14} /> Продолжить покупки
            </Link>

            {totalPrice >= 20000 && (
              <div className="mt-4 p-3 bg-success/10 text-success text-sm rounded-lg text-center font-medium">
                Бесплатная доставка по Москве!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
