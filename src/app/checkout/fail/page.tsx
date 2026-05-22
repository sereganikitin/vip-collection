import Link from 'next/link';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ orderId?: string; reason?: string }>;
}

const REASON_HINT: Record<string, string> = {
  'missing-order': 'Не передан номер заказа. Попробуйте оформить заказ заново.',
  'order-not-found': 'Заказ не найден. Возможно, он был удалён.',
  'init-failed': 'Не удалось создать платёжный сеанс. Свяжитесь с нами или попробуйте ещё раз.',
};

export default async function CheckoutFailPage({ searchParams }: PageProps) {
  const { orderId, reason } = await searchParams;
  let orderNumber: number | null = null;
  if (orderId) {
    const o = await prisma.order.findUnique({ where: { id: orderId }, select: { number: true } });
    if (o) orderNumber = o.number;
  }

  const hint = reason ? REASON_HINT[reason] : undefined;

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-6">
        <AlertTriangle size={32} />
      </div>
      <h1 className="text-2xl font-bold mb-3">
        Оплата не прошла{orderNumber ? ` (заказ #${orderNumber})` : ''}
      </h1>
      <p className="text-text-muted mb-3">
        Платёж был отменён или не подтверждён банком. Деньги, если списывались, вернутся автоматически в течение 1-3 рабочих дней.
      </p>
      {hint && <p className="text-text-muted text-sm mb-6">{hint}</p>}

      <div className="flex items-center justify-center gap-3 flex-wrap">
        {orderId && (
          <a
            href={`/api/payment/tinkoff/init?orderId=${orderId}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-primary font-semibold rounded-lg hover:bg-accent-hover transition-colors"
          >
            <RefreshCcw size={18} /> Попробовать снова
          </a>
        )}
        <Link
          href="/contacts"
          className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded-lg hover:bg-gray-50 transition-colors"
        >
          Связаться с нами
        </Link>
      </div>
    </div>
  );
}
