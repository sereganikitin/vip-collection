import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { sendOrderEmails } from '@/lib/mail';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orders = await prisma.order.findMany({
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { items, customerName, customerPhone, customerEmail, deliveryAddress, deliveryMethod, comment } = data;

    if (!items?.length || !customerName || !customerPhone) {
      return NextResponse.json({ error: 'Заполните обязательные поля' }, { status: 400 });
    }

    // Items can contain productId (DB id) or productSlug (from static data)
    // Try to resolve all products from DB
    const slugs = items.map((i: { productSlug?: string }) => i.productSlug).filter(Boolean);
    const ids = items.map((i: { productId?: string }) => i.productId).filter(Boolean);

    let products = await prisma.product.findMany({
      where: {
        OR: [
          ...(ids.length > 0 ? [{ id: { in: ids } }] : []),
          ...(slugs.length > 0 ? [{ slug: { in: slugs } }] : []),
        ],
      },
    });

    // If no products found by id, try matching by slug from the items
    if (products.length === 0) {
      return NextResponse.json({ error: 'Товары не найдены в базе данных' }, { status: 400 });
    }

    // Build order items, matching by id or slug
    const orderItems = items.map((item: { productId?: string; productSlug?: string; quantity: number }) => {
      const product = products.find(
        (p) => p.id === item.productId || p.slug === item.productSlug
      );
      if (!product) return null;
      return {
        productId: product.id,
        quantity: item.quantity,
        price: product.price,
      };
    }).filter(Boolean);

    if (orderItems.length === 0) {
      return NextResponse.json({ error: 'Не удалось найти товары для заказа' }, { status: 400 });
    }

    const totalPrice = orderItems.reduce(
      (sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0
    );

    const order = await prisma.order.create({
      data: {
        totalPrice,
        customerName,
        customerPhone,
        customerEmail,
        deliveryAddress,
        deliveryMethod,
        comment,
        items: { create: orderItems },
      },
      include: { items: { include: { product: true } } },
    });

    // Send email notifications (async, don't block response)
    sendOrderEmails({
      orderNumber: order.number,
      customerName,
      customerPhone,
      customerEmail,
      deliveryMethod,
      deliveryAddress,
      comment,
      totalPrice: order.totalPrice,
      items: order.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.price,
      })),
    }).catch(console.error);

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании заказа. Попробуйте позже.' },
      { status: 500 }
    );
  }
}
