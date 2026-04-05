import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

async function getSmtpConfig() {
  const settings = await prisma.setting.findMany({
    where: { key: { in: ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from'] } },
  });
  const config: Record<string, string> = {};
  settings.forEach((s) => { config[s.key] = s.value; });
  return config;
}

async function getAdminEmail() {
  const setting = await prisma.setting.findUnique({ where: { key: 'admin_email' } });
  return setting?.value || 'k959em177@gmail.com';
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
}

interface OrderEmailData {
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryMethod?: string;
  deliveryAddress?: string;
  comment?: string;
  totalPrice: number;
  items: { name: string; quantity: number; price: number }[];
}

function buildOrderHtml(order: OrderEmailData, forAdmin: boolean) {
  const itemsHtml = order.items.map((item) =>
    `<tr><td style="padding:8px;border-bottom:1px solid #eee">${item.name}</td>
     <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
     <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${formatPrice(item.price)}</td>
     <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${formatPrice(item.price * item.quantity)}</td></tr>`
  ).join('');

  const title = forAdmin
    ? `Новый заказ #${order.orderNumber}`
    : `Ваш заказ #${order.orderNumber} принят`;

  const greeting = forAdmin
    ? `<p>Поступил новый заказ на сайте VIP COLLECTION.</p>`
    : `<p>Здравствуйте, ${order.customerName}!</p><p>Спасибо за ваш заказ. Мы свяжемся с вами в ближайшее время для подтверждения.</p>`;

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#62221C;color:white;padding:20px;text-align:center">
        <h1 style="margin:0;font-size:20px">VIP COLLECTION</h1>
      </div>
      <div style="padding:20px">
        <h2 style="color:#62221C">${title}</h2>
        ${greeting}
        ${forAdmin ? `<p><strong>Клиент:</strong> ${order.customerName}<br><strong>Телефон:</strong> ${order.customerPhone}${order.customerEmail ? `<br><strong>Email:</strong> ${order.customerEmail}` : ''}</p>` : ''}
        ${order.deliveryMethod ? `<p><strong>Доставка:</strong> ${order.deliveryMethod}</p>` : ''}
        ${order.deliveryAddress ? `<p><strong>Адрес:</strong> ${order.deliveryAddress}</p>` : ''}
        ${order.comment ? `<p><strong>Комментарий:</strong> ${order.comment}</p>` : ''}
        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          <tr style="background:#f5f5f5">
            <th style="padding:8px;text-align:left">Товар</th>
            <th style="padding:8px;text-align:center">Кол-во</th>
            <th style="padding:8px;text-align:right">Цена</th>
            <th style="padding:8px;text-align:right">Сумма</th>
          </tr>
          ${itemsHtml}
        </table>
        <p style="font-size:18px;font-weight:bold;text-align:right">Итого: ${formatPrice(order.totalPrice)}</p>
      </div>
      <div style="background:#f5f5f5;padding:15px;text-align:center;font-size:12px;color:#666">
        VIP COLLECTION — Чемоданы и аксессуары для путешествий<br>
        +7 (917) 574-11-30 | vipcoll@mail.ru
      </div>
    </div>
  `;
}

export async function sendOrderEmails(order: OrderEmailData) {
  const smtp = await getSmtpConfig();
  const adminEmail = await getAdminEmail();

  if (!smtp.smtp_host || !smtp.smtp_user || !smtp.smtp_pass) {
    console.log('SMTP not configured, skipping email notifications');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtp.smtp_host,
    port: parseInt(smtp.smtp_port || '587'),
    secure: smtp.smtp_port === '465',
    auth: { user: smtp.smtp_user, pass: smtp.smtp_pass },
  });

  const from = smtp.smtp_from || smtp.smtp_user;

  // Send to admin
  try {
    await transporter.sendMail({
      from,
      to: adminEmail,
      subject: `Новый заказ #${order.orderNumber} — VIP COLLECTION`,
      html: buildOrderHtml(order, true),
    });
    console.log(`Admin notification sent to ${adminEmail}`);
  } catch (e) {
    console.error('Failed to send admin email:', e);
  }

  // Send to customer
  if (order.customerEmail) {
    try {
      await transporter.sendMail({
        from,
        to: order.customerEmail,
        subject: `Ваш заказ #${order.orderNumber} принят — VIP COLLECTION`,
        html: buildOrderHtml(order, false),
      });
      console.log(`Customer notification sent to ${order.customerEmail}`);
    } catch (e) {
      console.error('Failed to send customer email:', e);
    }
  }
}
