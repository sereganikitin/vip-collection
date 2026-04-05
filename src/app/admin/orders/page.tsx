'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { LogOut, ArrowLeft } from 'lucide-react';

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
  deliveryAddress?: string;
  comment?: string;
  items: OrderItem[];
  createdAt: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  NEW: { label: 'Новый', color: 'bg-blue-100 text-blue-700' },
  PROCESSING: { label: 'В обработке', color: 'bg-yellow-100 text-yellow-700' },
  SHIPPED: { label: 'Отправлен', color: 'bg-purple-100 text-purple-700' },
  DELIVERED: { label: 'Доставлен', color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Отменён', color: 'bg-red-100 text-red-700' },
};

export default function AdminOrders() {
  const { status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  function formatPrice(price: number) {
    return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
          <Link href="/admin/products" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Товары</Link>
          <Link href="/admin/categories" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Категории</Link>
          <Link href="/admin/brands" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Бренды</Link>
          <Link href="/admin/orders" className="px-4 py-3 text-sm font-medium text-accent border-b-2 border-accent whitespace-nowrap">Заказы</Link>
          <Link href="/admin/banners" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Баннеры</Link>
          <Link href="/admin/settings" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Настройки</Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-text-muted hover:text-text"><ArrowLeft size={20} /></Link>
          <h2 className="text-2xl font-bold">Заказы ({orders.length})</h2>
        </div>

        {loading ? (
          <p className="text-text-muted">Загрузка...</p>
        ) : orders.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border p-12 text-center">
            <p className="text-text-muted">Заказов пока нет</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-surface rounded-xl border border-border overflow-hidden">
                <div
                  className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                >
                  <div className="flex items-center gap-6">
                    <span className="font-bold text-lg">#{order.number}</span>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusLabels[order.status]?.color}`}>
                      {statusLabels[order.status]?.label}
                    </span>
                    <span className="text-text-muted text-sm">{formatDate(order.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold">{formatPrice(order.totalPrice)}</span>
                    <span className="text-text-muted">{expandedId === order.id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {expandedId === order.id && (
                  <div className="px-6 py-4 border-t border-border">
                    <div className="grid md:grid-cols-2 gap-6 mb-4">
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Клиент</h4>
                        <p className="text-sm">{order.customerName}</p>
                        <p className="text-sm text-text-muted">{order.customerPhone}</p>
                        {order.customerEmail && <p className="text-sm text-text-muted">{order.customerEmail}</p>}
                        {order.deliveryAddress && <p className="text-sm text-text-muted mt-1">Адрес: {order.deliveryAddress}</p>}
                        {order.comment && <p className="text-sm text-text-muted mt-1">Комментарий: {order.comment}</p>}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Изменить статус</h4>
                        <select
                          value={order.status}
                          onChange={(e) => updateStatus(order.id, e.target.value)}
                          className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                        >
                          {Object.entries(statusLabels).map(([key, { label }]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </div>
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
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
