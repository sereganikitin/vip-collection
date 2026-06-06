import Link from 'next/link';
import { Check } from 'lucide-react';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ orderId?: string }>;
}

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const { orderId } = await searchParams;
  let orderNumber: number | null = null;
  let paymentStatus: string | null = null;
  let paymentMethod: string | null = null;

  if (orderId) {
    const o = await prisma.order.findUnique({
      where: { id: orderId },
      select: { number: true, paymentStatus: true, paymentMethod: true },
    });
    if (o) {
      orderNumber = o.number;
      paymentStatus = o.paymentStatus;
      paymentMethod = o.paymentMethod;
    }
  }

  const paid = paymentStatus === 'paid';
  const onlineButNotPaidYet = paymentMethod === 'online' && !paid;

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-6">
        <Check size={32} />
      </div>
      <h1 className="text-2xl font-bold mb-3">
        {orderNumber ? `Заказ #${orderNumber} оформлен!` : 'Заказ оформлен!'}
      </h1>

      {paymentMethod === 'cash' && (
        <p className="text-text-muted mb-6">
          Спасибо за заказ. Мы свяжемся с вами в ближайшее время для подтверждения деталей.
          Оплата — при получении.
        </p>
      )}

      {paid && (
        <p className="text-text-muted mb-6">
          Оплата прошла успешно. Мы свяжемся с вами для уточнения деталей доставки.
        </p>
      )}

      {onlineButNotPaidYet && (
        <p className="text-text-muted mb-6">
          Статус оплаты пока ожидает подтверждения от банка. Если деньги были списаны — мы получим уведомление автоматически и
          свяжемся с вами в течение нескольких минут. Если списания не было — попробуйте оплатить ещё раз через ссылку из писем.
        </p>
      )}

      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-primary font-semibold rounded-lg hover:bg-accent-hover transition-colors"
      >
        На главную
      </Link>
    </div>
  );
}
