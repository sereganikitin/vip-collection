'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Check, ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatPhoneMask, validateRussianPhone, validateEmailFormat } from '@/lib/validation';
import RussiaCheckoutFlow, { type RussiaSelection } from '@/components/checkout/RussiaCheckoutFlow';

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
    delivery: 'courier', city: 'Москва', address: '', comment: '',
    payment: 'online' as 'online' | 'cash',
    consent: false,
  });
  // Состояние Я.Доставки (по России) — отдельный компонент-флоу
  const [russiaSel, setRussiaSel] = useState<RussiaSelection>({ ready: false });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Маска телефона. При onChange — приводим вводимое к виду +7 (XXX) XXX-XX-XX.
  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, phone: formatPhoneMask(e.target.value) }));
  }

  // Валидационные сообщения — показываем только если поле уже заполнено,
  // чтобы не пугать пользователя пустыми ошибками с первого клика.
  const phoneCheck = form.phone ? validateRussianPhone(form.phone) : null;
  const emailFmt = form.email ? validateEmailFormat(form.email) : null;
  const phoneError = phoneCheck && !phoneCheck.ok ? phoneCheck.error : null;
  const emailFormatError = emailFmt && !emailFmt.ok ? emailFmt.error : null;

  // Подсказка по типичным опечаткам в email — чтобы реже получать bounce.
  // Покрывает 90% случаев: домены без точки, .con/.cmo/.copm/.ru вместо популярных,
  // gmial/gnail/yndex/ramber и т.п.
  function emailTypoHint(email: string): string | null {
    if (!email || !email.includes('@')) return null;
    const [, raw] = email.split('@');
    const domain = (raw || '').toLowerCase().trim();
    if (!domain) return null;

    const DOMAIN_FIXES: Record<string, string> = {
      'gmail.con': 'gmail.com', 'gmail.cmo': 'gmail.com', 'gmail.copm': 'gmail.com',
      'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.ocm': 'gmail.com',
      'gmial.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gnail.com': 'gmail.com',
      'gmail.ru': 'gmail.com',
      'yandex.con': 'yandex.ru', 'yndex.ru': 'yandex.ru', 'yandex.r': 'yandex.ru',
      'yandex.com.ru': 'yandex.ru', 'yndx.ru': 'yandex.ru',
      'mail.con': 'mail.ru', 'mial.ru': 'mail.ru', 'mali.ru': 'mail.ru',
      'rambler.com': 'rambler.ru', 'ramber.ru': 'rambler.ru',
      'inbox.con': 'inbox.ru', 'list.con': 'list.ru', 'bk.con': 'bk.ru',
      'hotmail.con': 'hotmail.com', 'outlook.con': 'outlook.com',
      'yahoo.con': 'yahoo.com', 'icloud.con': 'icloud.com',
    };
    const fix = DOMAIN_FIXES[domain];
    if (fix) return `Возможно, имели в виду ${email.split('@')[0]}@${fix}?`;

    // Домен без точки или с одной буквой в TLD
    if (!/\.[a-z]{2,}$/i.test(domain)) {
      return 'Похоже, в адресе ошибка — проверьте часть после @ (например, gmail.com).';
    }
    return null;
  }
  const emailHint = emailTypoHint(form.email);

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
    courier: 'Курьер по Москве',
    'yandex-russia': 'Я.Доставка по России',
  };
  // Обе опции принимают и наличные, и онлайн.
  // Для курьера по Москве «наличные» — это деньги курьеру при получении.
  // Для Я.Доставки — оплата получателем при выдаче (наложенный платёж).
  const effectivePayment = form.payment;

  const deliveryPrice = form.delivery === 'yandex-russia' ? (russiaSel.priceRub ?? 0) : 0;
  const grandTotal = totalPrice + deliveryPrice;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.consent) {
      setError('Подтвердите согласие на обработку персональных данных');
      return;
    }
    // Для Я.Доставки обязателен выбранный оффер
    if (form.delivery === 'yandex-russia' && !russiaSel.ready) {
      setError('Выберите ПВЗ или адрес и нажмите «Посчитать стоимость доставки»');
      return;
    }
    // Финальная проверка перед отправкой — гарантия, что не пробьётся
    // невалидный телефон/email даже если пользователь обошёл реактивное
    // отображение ошибок (например, заполнил всё разом скриптом).
    const finalPhone = validateRussianPhone(form.phone);
    if (!finalPhone.ok) {
      setError(finalPhone.error || 'Проверьте номер телефона');
      return;
    }
    if (form.email) {
      const finalEmail = validateEmailFormat(form.email);
      if (!finalEmail.ok) {
        setError(finalEmail.error || 'Проверьте email');
        return;
      }
    }
    setLoading(true);
    setError('');

    // Адрес для записи в заказ:
    //  - курьер по Москве: «<город>, <адрес>» из формы
    //  - Я.Доставка ПВЗ:    адрес выбранного ПВЗ
    //  - Я.Доставка дверь:  полный адрес из подсказок
    let deliveryAddressForOrder: string;
    let deliveryMethodForOrder: string;
    if (form.delivery === 'yandex-russia' && russiaSel.ready) {
      const cityPart = russiaSel.city ?? '';
      if (russiaSel.mode === 'pickup' && russiaSel.pointAddress) {
        deliveryAddressForOrder = russiaSel.pointAddress;
        deliveryMethodForOrder = `Я.Доставка по России — ПВЗ${cityPart ? ` (${cityPart})` : ''}`;
      } else if (russiaSel.mode === 'door' && russiaSel.doorAddress) {
        deliveryAddressForOrder = russiaSel.doorAddress;
        deliveryMethodForOrder = `Я.Доставка по России — курьер до двери${cityPart ? ` (${cityPart})` : ''}`;
      } else {
        deliveryAddressForOrder = `${cityPart}`.trim();
        deliveryMethodForOrder = 'Я.Доставка по России';
      }
    } else {
      deliveryAddressForOrder = `${form.city.trim()}, ${form.address.trim()}`;
      deliveryMethodForOrder = deliveryLabels[form.delivery] || form.delivery;
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: `${form.firstName} ${form.lastName}`.trim(),
          customerPhone: form.phone,
          customerEmail: form.email || undefined,
          deliveryMethod: deliveryMethodForOrder,
          deliveryAddress: deliveryAddressForOrder,
          comment: form.comment || undefined,
          paymentMethod: effectivePayment,
          deliveryPrice: deliveryPrice > 0 ? deliveryPrice : undefined,
          yandexRussiaMeta:
            form.delivery === 'yandex-russia' && russiaSel.ready
              ? {
                  mode: russiaSel.mode,
                  city: russiaSel.city,
                  geoId: russiaSel.geoId,
                  pointId: russiaSel.pointId,
                  pointAddress: russiaSel.pointAddress,
                  doorAddress: russiaSel.doorAddress,
                  doorGeopoint: russiaSel.doorGeopoint,
                  offerId: russiaSel.offerId,
                  priceRub: russiaSel.priceRub,
                  partner: russiaSel.partner,
                  deliveryFrom: russiaSel.deliveryFromIso,
                  deliveryTo: russiaSel.deliveryToIso,
                }
              : undefined,
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
      clearCart();

      if (effectivePayment === 'online') {
        // Tinkoff init redirects to its payment page (and caches PaymentURL on Order).
        window.location.href = `/api/payment/tinkoff/init?orderId=${order.id}`;
        return;
      }

      setOrderNumber(order.number);
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
                  <input
                    type="tel"
                    required
                    placeholder="+7 (___) ___-__-__"
                    inputMode="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={handlePhoneChange}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-1 ${
                      phoneError
                        ? 'border-danger focus:border-danger focus:ring-danger'
                        : 'border-border focus:border-accent focus:ring-accent'
                    }`}
                  />
                  {phoneError && (
                    <p className="mt-1.5 text-xs text-danger">{phoneError}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="Для получения уведомлений"
                    autoComplete="email"
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-1 ${
                      emailFormatError
                        ? 'border-danger focus:border-danger focus:ring-danger'
                        : 'border-border focus:border-accent focus:ring-accent'
                    }`}
                  />
                  {emailFormatError ? (
                    <p className="mt-1.5 text-xs text-danger">{emailFormatError}</p>
                  ) : emailHint ? (
                    <p className="mt-1.5 text-xs text-danger">{emailHint}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-xl border border-border p-6">
              <h2 className="font-semibold text-lg mb-4">Доставка</h2>
              <div className="space-y-3 mb-4">
                {[
                  { value: 'courier',       label: 'Курьер по Москве',        desc: 'Доставка в день заказа или на следующий день. Расчёт по адресу.' },
                  { value: 'yandex-russia', label: 'Я.Доставка по России',    desc: 'Отправка через сеть Я.Доставки во все города России. Расчёт по адресу.' },
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
              {form.delivery === 'courier' ? (
                <div className="grid sm:grid-cols-[1fr_2fr] gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Город *</label>
                    <input type="text" required value={form.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      placeholder="Москва"
                      className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Улица, дом, квартира *</label>
                    <input type="text" required value={form.address}
                      onChange={(e) => updateField('address', e.target.value)}
                      placeholder="например, Годовикова 11, корпус 4, кв. 126"
                      className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
                  </div>
                </div>
              ) : (
                <RussiaCheckoutFlow
                  items={items.map(({ product, quantity }) => ({ productId: product.id, quantity }))}
                  customer={{
                    name: `${form.firstName} ${form.lastName}`.trim(),
                    phone: form.phone,
                    email: form.email,
                  }}
                  onChange={setRussiaSel}
                />
              )}
            </div>

            <div className="bg-surface rounded-xl border border-border p-6">
              <h2 className="font-semibold text-lg mb-4">Оплата</h2>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:border-accent transition-colors">
                  <input type="radio" name="payment" value="online" checked={effectivePayment === 'online'}
                    onChange={() => setForm((f) => ({ ...f, payment: 'online' }))}
                    className="mt-1 accent-accent" />
                  <div>
                    <p className="font-medium text-sm">Картой или СБП онлайн</p>
                    <p className="text-xs text-text-muted">Защищённая оплата через Тинькофф. После подтверждения заказа вы будете перенаправлены на платёжную страницу.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:border-accent transition-colors">
                  <input type="radio" name="payment" value="cash" checked={effectivePayment === 'cash'}
                    onChange={() => setForm((f) => ({ ...f, payment: 'cash' }))}
                    className="mt-1 accent-accent" />
                  <div>
                    <p className="font-medium text-sm">При получении</p>
                    <p className="text-xs text-text-muted">
                      {form.delivery === 'courier'
                        ? 'Наличными или картой курьеру при получении в Москве.'
                        : 'Оплата при получении в пункте выдачи Я.Доставки (наложенный платёж).'}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="bg-surface rounded-xl border border-border p-6">
              <h2 className="font-semibold text-lg mb-4">Комментарий</h2>
              <textarea rows={3} value={form.comment} onChange={(e) => updateField('comment', e.target.value)}
                placeholder="Дополнительная информация к заказу..."
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none" />
            </div>

            <div className="bg-surface rounded-xl border border-border p-6">
              <label className="flex items-start gap-3 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => setForm((f) => ({ ...f, consent: e.target.checked }))}
                  required
                  className="mt-1 w-4 h-4 accent-accent flex-shrink-0"
                />
                <span className="text-text-muted">
                  Оформляя заказ, я соглашаюсь с условиями{' '}
                  <Link href="/terms" target="_blank" className="text-accent hover:underline">договора-оферты</Link>{' '}
                  и даю согласие на обработку своих персональных данных согласно{' '}
                  <Link href="/privacy" target="_blank" className="text-accent hover:underline">Политике конфиденциальности</Link>.
                </span>
              </label>
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
              <hr className="border-border mb-3" />
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-muted">Товары</span>
                <span className="font-medium">{formatPrice(totalPrice)}</span>
              </div>
              {form.delivery === 'yandex-russia' && (
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-text-muted">Доставка</span>
                  <span className="font-medium">
                    {russiaSel.ready
                      ? formatPrice(deliveryPrice)
                      : <span className="text-text-muted/70 italic">укажите ПВЗ/адрес</span>}
                  </span>
                </div>
              )}
              <hr className="border-border mb-3" />
              <div className="flex justify-between text-lg font-bold mb-6">
                <span>Итого</span>
                <span>{formatPrice(grandTotal)}</span>
              </div>
              <button type="submit" disabled={loading}
                className="block w-full text-center py-3.5 bg-accent text-primary font-semibold rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50">
                {loading ? 'Оформление...' : effectivePayment === 'online' ? 'Перейти к оплате' : 'Подтвердить заказ'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
