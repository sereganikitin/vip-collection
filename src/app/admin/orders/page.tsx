'use client';

import AdminNav from '@/components/admin/AdminNav';
import RussiaDeliveryBlock, { type SavedRussiaMeta } from '@/components/admin/RussiaDeliveryBlock';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { LogOut, ArrowLeft, ExternalLink, CreditCard, Wallet, Check, Send } from 'lucide-react';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: { name: string };
}

interface Order {
  id: string;
  number: number;
  status: string;
  totalPrice: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryMethod?: string;
  deliveryAddress?: string;
  comment?: string;
  items: OrderItem[];
  paymentMethod: 'cash' | 'online';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentId?: string | null;
  paymentUrl?: string | null;
  paidAt?: string | null;
  // Я.Доставка
  yandexClaimId?: string | null;
  yandexClaimStatus?: string | null;
  yandexClaimTariff?: string | null;
  yandexClaimPrice?: number | null;
  yandexClaimEta?: string | null;
  yandexClaimUrl?: string | null;
  // Сохранённый при чекауте выбор ПВЗ/адреса (JSON-строка)
  yandexRussiaMeta?: string | null;
  deliveryPrice?: number | null;
  createdAt: string;
}

const TARIFF_LABELS: Record<string, string> = {
  courier: 'Курьер (на день)',
  express: 'Экспресс',
  cargo: 'Грузовой',
  intercity: 'Межгород',
  'russia-pickup': 'Россия · ПВЗ',
  'russia-door':   'Россия · до двери',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  NEW:        { label: 'Новый',        color: 'bg-blue-100 text-blue-700' },
  PROCESSING: { label: 'В обработке',  color: 'bg-yellow-100 text-yellow-700' },
  SHIPPED:    { label: 'Отправлен',    color: 'bg-purple-100 text-purple-700' },
  DELIVERED:  { label: 'Доставлен',    color: 'bg-green-100 text-green-700' },
  CANCELLED:  { label: 'Отменён',      color: 'bg-red-100 text-red-700' },
};

const paymentMethodLabels: Record<string, { label: string; icon: typeof CreditCard }> = {
  online: { label: 'Онлайн', icon: CreditCard },
  cash:   { label: 'При получении', icon: Wallet },
};

const paymentStatusLabels: Record<string, { label: string; color: string }> = {
  pending:  { label: 'Ожидает оплаты', color: 'bg-yellow-100 text-yellow-700' },
  paid:     { label: 'Оплачен',        color: 'bg-green-100 text-green-700' },
  failed:   { label: 'Не оплачен',     color: 'bg-red-100 text-red-700' },
  refunded: { label: 'Возврат',        color: 'bg-gray-100 text-gray-700' },
};

type FilterKey =
  | 'active'      // оплачено + не доставлено + не отменено (дефолт — операторская работа)
  | 'new'         // status = NEW (включая PROCESSING как фактический «новый»)
  | 'unpaid'      // онлайн-оплата + pending, исключая отменённые
  | 'paid'        // paymentStatus = paid
  | 'cancelled'   // status = CANCELLED
  | 'all'         // без фильтра
  | 'completed';  // status = DELIVERED — выполненные, крайняя справа

interface FilterDef {
  key: FilterKey;
  label: string;
  predicate: (o: Order) => boolean;
  tone?: 'danger'; // для отмены — тёмная подсветка
}

// «В обработке» и «Отправлены» убраны: PROCESSING фолдится в «Новые»,
// SHIPPED уже покрывается «Активные» (оплачено + не доставлено).
const FILTER_DEFS: FilterDef[] = [
  { key: 'active',     label: 'Активные',       predicate: (o) =>
      o.paymentStatus === 'paid' && o.status !== 'DELIVERED' && o.status !== 'CANCELLED' },
  { key: 'new',        label: 'Новые',          predicate: (o) =>
      o.status === 'NEW' || o.status === 'PROCESSING' },
  { key: 'unpaid',     label: 'Ожидают оплаты', predicate: (o) =>
      o.paymentMethod === 'online' && o.paymentStatus === 'pending' && o.status !== 'CANCELLED' },
  { key: 'paid',       label: 'Оплачены',       predicate: (o) => o.paymentStatus === 'paid' },
  { key: 'cancelled',  label: 'Отменены',       predicate: (o) => o.status === 'CANCELLED', tone: 'danger' },
  { key: 'all',        label: 'Все',            predicate: () => true },
  { key: 'completed',  label: 'Выполненные',    predicate: (o) => o.status === 'DELIVERED' },
];

export default function AdminOrders() {
  const { status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('active');

  const fetchOrders = useCallback(async () => {
    const res = await fetch('/api/orders');
    const data = await res.json();
    setOrders(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/admin/login');
    if (status === 'authenticated') fetchOrders();
  }, [status, router, fetchOrders]);

  async function updateStatus(orderId: string, newStatus: string) {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchOrders();
  }

  async function markPaid(orderId: string) {
    if (!confirm('Отметить заказ как оплаченный?')) return;
    await fetch(`/api/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentStatus: 'paid' }),
    });
    fetchOrders();
  }

  async function resendNotifications(orderId: string) {
    try {
      const res = await fetch(`/api/orders/${orderId}/notify`, { method: 'POST' });
      const data = await res.json();
      const tg = data?.telegram?.ok ? '✓ TG' : '✗ TG';
      const mail = data?.email?.ok ? '✓ Email' : '✗ Email';
      alert(`Уведомления переотправлены:\n${tg}\n${mail}\n\nЕсли что-то не сработало — посмотрите server logs или проверьте настройки в админке.`);
    } catch (e) {
      alert(`Ошибка переотправки: ${String(e)}`);
    }
  }

  // ── Yandex Delivery: только отмена существующей заявки ───────
  async function cancelClaimUI(orderId: string) {
    if (!confirm('Отменить заявку в Я.Доставке?')) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/claim`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(`Ошибка: ${data.error || res.statusText}`);
        return;
      }
      alert('Заявка отменена');
      fetchOrders();
    } catch (e) {
      alert(`Ошибка: ${String(e)}`);
    }
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
  }

  function formatDate(date: string | null | undefined) {
    if (!date) return '—';
    return new Date(date).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  if (status !== 'authenticated') {
    return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;
  }

  const counts = Object.fromEntries(
    FILTER_DEFS.map((f) => [f.key, orders.filter(f.predicate).length])
  ) as Record<FilterKey, number>;

  const activeFilter = FILTER_DEFS.find((f) => f.key === filter) ?? FILTER_DEFS[0];
  const visibleOrders = orders.filter(activeFilter.predicate);

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

      <AdminNav current="orders" />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-text-muted hover:text-text"><ArrowLeft size={20} /></Link>
          <h2 className="text-2xl font-bold">Заказы</h2>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {FILTER_DEFS.map((f) => {
            const isActive = filter === f.key;
            const n = counts[f.key];
            const dim = !isActive && n === 0;
            const activeStyle = f.tone === 'danger'
              ? 'bg-danger text-white border-danger font-medium'
              : 'bg-accent text-primary border-accent font-medium';
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  isActive
                    ? activeStyle
                    : `border-border hover:border-accent hover:text-text ${dim ? 'text-text-muted/60' : 'text-text-muted'}`
                }`}
              >
                {f.label} · {n}
              </button>
            );
          })}
        </div>

        {loading ? (
          <p className="text-text-muted">Загрузка...</p>
        ) : visibleOrders.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border p-12 text-center">
            <p className="text-text-muted">
              {filter === 'all' ? 'Заказов пока нет' : `В фильтре «${activeFilter.label}» пусто`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleOrders.map((order) => {
              const pm = paymentMethodLabels[order.paymentMethod] ?? paymentMethodLabels.cash;
              const ps = paymentStatusLabels[order.paymentStatus] ?? paymentStatusLabels.pending;
              const PmIcon = pm.icon;
              return (
                <div key={order.id} className="bg-surface rounded-xl border border-border overflow-hidden">
                  <div
                    className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors gap-4 flex-wrap"
                    onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                  >
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="font-bold text-lg">#{order.number}</span>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusLabels[order.status]?.color}`}>
                        {statusLabels[order.status]?.label}
                      </span>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${ps.color}`}>
                        {ps.label}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-text-muted">
                        <PmIcon size={14} /> {pm.label}
                      </span>
                      <span className="text-text-muted text-sm">{formatDate(order.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold">{formatPrice(order.totalPrice)}</div>
                        {order.deliveryPrice != null && order.deliveryPrice > 0 && (
                          <div className="text-[10px] text-text-muted">
                            вкл. доставку {formatPrice(order.deliveryPrice)}
                          </div>
                        )}
                      </div>
                      <span className="text-text-muted">{expandedId === order.id ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {expandedId === order.id && (
                    <div className="px-6 py-4 border-t border-border">
                      <div className="grid md:grid-cols-3 gap-6 mb-4">
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Клиент</h4>
                          <p className="text-sm">{order.customerName}</p>
                          <p className="text-sm text-text-muted">{order.customerPhone}</p>
                          {order.customerEmail && <p className="text-sm text-text-muted">{order.customerEmail}</p>}
                          {order.deliveryMethod && <p className="text-sm text-text-muted mt-1">Доставка: {order.deliveryMethod}</p>}
                          {order.deliveryAddress && <p className="text-sm text-text-muted mt-1">Адрес: {order.deliveryAddress}</p>}
                          {order.comment && <p className="text-sm text-text-muted mt-1">Комментарий: {order.comment}</p>}
                        </div>

                        <div>
                          <h4 className="font-semibold text-sm mb-2">Оплата</h4>
                          <p className="text-sm">Способ: <span className="font-medium">{pm.label}</span></p>
                          <p className="text-sm">Статус: <span className="font-medium">{ps.label}</span></p>
                          {order.paidAt && (
                            <p className="text-sm text-text-muted mt-1">Оплачен: {formatDate(order.paidAt)}</p>
                          )}
                          {order.paymentId && (
                            <p className="text-xs text-text-muted mt-1 font-mono break-all">PaymentId: {order.paymentId}</p>
                          )}
                          {order.paymentStatus !== 'paid' && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {order.paymentMethod === 'online' && (
                                <a
                                  href={`/api/payment/tinkoff/init?orderId=${order.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-accent text-primary font-medium rounded-lg text-xs hover:bg-accent-hover transition-colors"
                                >
                                  <ExternalLink size={12} /> Открыть страницу оплаты
                                </a>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); markPaid(order.id); }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 border border-success text-success font-medium rounded-lg text-xs hover:bg-success/5 transition-colors"
                              >
                                <Check size={12} /> Отметить как оплачен
                              </button>
                            </div>
                          )}
                        </div>

                        <div>
                          <h4 className="font-semibold text-sm mb-2">Изменить статус</h4>
                          <select
                            value={order.status}
                            onChange={(e) => updateStatus(order.id, e.target.value)}
                            className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent w-full"
                          >
                            {Object.entries(statusLabels).map(([key, { label }]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); resendNotifications(order.id); }}
                            className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 border border-border text-text font-medium rounded-lg text-xs hover:border-accent hover:text-accent transition-colors w-full justify-center"
                          >
                            <Send size={12} /> Переотправить TG и email
                          </button>
                        </div>
                      </div>

                      {/* Я.Доставка */}
                      <div className="mb-4 p-4 bg-bg rounded-lg border border-border">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-sm">Яндекс Доставка</h4>
                          {order.deliveryAddress ? (
                            <span className="text-xs text-text-muted truncate max-w-md">
                              → {order.deliveryAddress}
                            </span>
                          ) : (
                            <span className="text-xs text-text-muted">Адрес из формы не задан — введите вручную ниже</span>
                          )}
                        </div>

                        {order.yandexClaimId ? (
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                                {order.yandexClaimStatus ?? 'new'}
                              </span>
                              <span className="text-text-muted">
                                Тариф: <strong className="text-text">{TARIFF_LABELS[order.yandexClaimTariff ?? ''] ?? order.yandexClaimTariff}</strong>
                              </span>
                              {order.yandexClaimPrice != null && (
                                <span className="text-text-muted">
                                  Цена: <strong className="text-text">{formatPrice(order.yandexClaimPrice)}</strong>
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              {order.yandexClaimUrl && (
                                <a
                                  href={order.yandexClaimUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-border rounded-lg hover:border-accent hover:text-accent transition-colors"
                                >
                                  <ExternalLink size={12} /> Открыть в Я.Доставке
                                </a>
                              )}
                              {order.yandexClaimStatus !== 'cancelled' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); cancelClaimUI(order.id); }}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-danger text-danger rounded-lg hover:bg-danger/5 transition-colors"
                                >
                                  Отменить заявку
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          (() => {
                            let savedMeta: SavedRussiaMeta | null = null;
                            if (order.yandexRussiaMeta) {
                              try {
                                savedMeta = JSON.parse(order.yandexRussiaMeta) as SavedRussiaMeta;
                              } catch {}
                            }
                            return (
                              <>
                                {savedMeta && (
                                  <div className="mb-3 p-3 bg-accent/10 border border-accent/30 rounded-lg text-xs space-y-1">
                                    <p className="font-medium text-text">Клиент выбрал в чекауте:</p>
                                    <p>Город: <span className="font-medium">{savedMeta.city ?? '—'}</span></p>
                                    <p>Режим: <span className="font-medium">{savedMeta.mode === 'pickup' ? 'ПВЗ-получатель' : 'Курьер до двери'}</span></p>
                                    {savedMeta.mode === 'pickup' && savedMeta.pointAddress && (
                                      <p>ПВЗ: <span className="font-medium">{savedMeta.pointAddress}</span></p>
                                    )}
                                    {savedMeta.mode === 'door' && savedMeta.doorAddress && (
                                      <p>Адрес: <span className="font-medium">{savedMeta.doorAddress}</span></p>
                                    )}
                                    {savedMeta.priceRub != null && (
                                      <p>Цена (при заказе): <span className="font-medium">{formatPrice(savedMeta.priceRub)}</span>
                                        {savedMeta.partner && <span className="text-text-muted"> · {savedMeta.partner}</span>}
                                      </p>
                                    )}
                                    <p className="text-text-muted text-[11px]">
                                      Поля ниже уже пред-заполнены. Нажмите «Посчитать стоимость» — цена может слегка отличаться (offer_id обновляется).
                                    </p>
                                  </div>
                                )}
                                <RussiaDeliveryBlock
                                  orderId={order.id}
                                  initialAddress={order.deliveryAddress ?? ''}
                                  savedMeta={savedMeta}
                                  onConfirmed={fetchOrders}
                                />
                              </>
                            );
                          })()
                        )}
                      </div>

                      <h4 className="font-semibold text-sm mb-2">Товары</h4>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-text-muted">
                            <th className="text-left py-1">Товар</th>
                            <th className="text-center py-1">Кол-во</th>
                            <th className="text-right py-1">Цена</th>
                            <th className="text-right py-1">Сумма</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item) => (
                            <tr key={item.id} className="border-t border-border">
                              <td className="py-2">{item.product.name}</td>
                              <td className="text-center py-2">{item.quantity}</td>
                              <td className="text-right py-2">{formatPrice(item.price)}</td>
                              <td className="text-right py-2 font-medium">{formatPrice(item.price * item.quantity)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
