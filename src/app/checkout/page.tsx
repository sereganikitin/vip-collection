'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Check, ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';

function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
}

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const [submitted, setSubmitted] = useState(false);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', email: '',
    delivery: 'cdek', address: '', comment: '',
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-6">
          <Check size={32} />
        </div>
        <h1 className="text-2xl font-bold mb-3">Заказ #{orderNumber} оформлен!</h1>
        <p className="text-text-muted mb-6">
          Спасибо за заказ. Мы свяжемся с вами в ближайшее время для подтверждения.
          {form.email && ' Подтверждение отправлено на вашу почту.'}
        </p>
        <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-primary font-semibold rounded-lg hover:bg-accent-hover transition-colors">
          На главную
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <ShoppingBag size={64} className="mx-auto text-gray-300 mb-6" />
        <h1 className="text-2xl font-bold mb-3">Корзина пуста</h1>
        <Link href="/" className="text-accent hover:underline">Вернуться на главную</Link>
      </div>
    );
  }

  const deliveryLabels: Record<string, string> = {
    cdek: 'СДЭК', post: 'Почта России', pickup: 'Самовывоз',
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: `${form.firstName} ${form.lastName}`.trim(),
          customerPhone: form.phone,
          customerEmail: form.email || undefined,
          deliveryMethod: deliveryLabels[form.delivery] || form.delivery,
          deliveryAddress: form.delivery !== 'pickup' ? form.address : 'Самовывоз: Москва, Сормовский пр-д, 11',
          comment: form.comment || undefined,
          items: items.map(({ product, quantity }) => ({
            productId: product.id,
            productSlug: product.slug,
            quantity,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Ошибка при оформлении заказа');
      }

      const order = await res.json();
      setOrderNumber(order.number);
      clearCart();
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link href="/" className="hover:text-accent transition-colors">Главная</Link>
        <ChevronRight size={14} />
        <Link href="/cart" className="hover:text-accent transition-colors">Корзина</Link>
        <ChevronRight size={14} />
        <span className="text-text font-medium">Оформление заказа</span>
      </nav>

      <h1 className="text-2xl md:text-3xl font-bold mb-8">Оформление заказа</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-danger rounded-lg">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface rounded-xl border border-border p-6">
              <h2 className="font-semibold text-lg mb-4">Контактные данные</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Имя *</label>
                  <input type="text" required value={form.firstName} onChange={(e) => updateField('firstName', e.target.value)}
                    className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Фамилия *</label>
                  <input type="text" required value={form.lastName} onChange={(e) => updateField('lastName', e.target.value)}
                    className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Телефон *</label>
                  <input type="tel" required placeholder="+7 (___) ___-__-__" value={form.phone} onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)}
                    placeholder="Для получения уведомлений"
                    className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-xl border border-border p-6">
              <h2 className="font-semibold text-lg mb-4">Доставка</h2>
              <div className="space-y-3 mb-4">
                {[
                  { value: 'cdek', label: 'СДЭК', desc: 'Доставка курьером или в пункт выдачи' },
                  { value: 'post', label: 'Почта России', desc: 'Доставка по всей России' },
                  { value: 'pickup', label: 'Самовывоз', desc: 'Москва, Сормовский пр-д, 11' },
                ].map((method) => (
                  <label key={method.value} className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:border-accent transition-colors">
                    <input type="radio" name="delivery" value={method.value} checked={form.delivery === method.value}
                      onChange={(e) => updateField('delivery', e.target.value)} className="mt-1 accent-accent" />
                    <div>
                      <p className="font-medium text-sm">{method.label}</p>
                      <p className="text-xs text-text-muted">{method.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              {form.delivery !== 'pickup' && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Адрес доставки *</label>
                  <input type="text" required={form.delivery !== 'pickup'} value={form.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder="Город, улица, дом, квартира"
                    className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
                </div>
              )}
            </div>

            <div className="bg-surface rounded-xl border border-border p-6">
              <h2 className="font-semibold text-lg mb-4">Комментарий</h2>
              <textarea rows={3} value={form.comment} onChange={(e) => updateField('comment', e.target.value)}
                placeholder="Дополнительная информация к заказу..."
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none" />
            </div>
          </div>

          <div>
            <div className="bg-surface rounded-xl border border-border p-6 sticky top-28">
              <h3 className="font-semibold text-lg mb-4">Ваш заказ</h3>
              <div className="space-y-3 mb-4">
                {items.map(({ product, quantity }) => (
                  <div key={product.id} className="flex justify-between text-sm">
                    <span className="text-text-muted line-clamp-1 mr-2">{product.name} x{quantity}</span>
                    <span className="font-medium flex-shrink-0">{formatPrice(product.price * quantity)}</span>
                  </div>
                ))}
              </div>
              <hr className="border-border mb-4" />
              <div className="flex justify-between text-lg font-bold mb-6">
                <span>Итого</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
              <button type="submit" disabled={loading}
                className="block w-full text-center py-3.5 bg-accent text-primary font-semibold rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50">
                {loading ? 'Оформление...' : 'Подтвердить заказ'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
