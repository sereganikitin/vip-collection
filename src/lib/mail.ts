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

// Возвращает массив email-адресов админов из настройки admin_email.
// Поддерживает несколько адресов через запятую / точку с запятой / перевод строки —
// все они получают уведомления о каждом новом заказе.
async function getAdminEmails(): Promise<string[]> {
  const setting = await prisma.setting.findUnique({ where: { key: 'admin_email' } });
  const raw = setting?.value || 'k959em177@gmail.com';
  return raw
    .split(/[,;\n]/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0 && e.includes('@'));
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
        +7 (925) 743-71-35 | vipshopp@yandex.ru
      </div>
    </div>
  `;
}

export async function sendOrderEmails(order: OrderEmailData) {
  const smtp = await getSmtpConfig();
  const adminEmails = await getAdminEmails();

  if (!smtp.smtp_host || !smtp.smtp_user || !smtp.smtp_pass) {
    console.log('SMTP not configured, skipping email notifications');
    return;
  }
  if (adminEmails.length === 0) {
    console.warn('No admin email configured — cannot send admin notification');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtp.smtp_host,
    port: parseInt(smtp.smtp_port || '587'),
    secure: smtp.smtp_port === '465',
    auth: { user: smtp.smtp_user, pass: smtp.smtp_pass },
  });

  const from = smtp.smtp_from || smtp.smtp_user;

  // Send to all admin emails в одном письме (To: copy для всех адресов).
  // Nodemailer принимает массив строк или строку с запятыми.
  try {
    await transporter.sendMail({
      from,
      to: adminEmails,
      subject: `Новый заказ #${order.orderNumber} — VIP COLLECTION`,
      html: buildOrderHtml(order, true),
    });
    console.log(`Admin notification sent to ${adminEmails.join(', ')}`);
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

// ──────────────────────────────────────────────────────────────
// Уведомление администратора о сообщении с формы обратной связи
// ──────────────────────────────────────────────────────────────

interface FeedbackEmailData {
  name: string;
  phone: string;
  message: string;
  receivedAt: Date;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildFeedbackHtml(fb: FeedbackEmailData): string {
  const date = fb.receivedAt.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
  const messageHtml = escapeHtml(fb.message).replace(/\n/g, '<br>');
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#62221C;color:white;padding:20px;text-align:center">
        <h1 style="margin:0;font-size:20px">VIP COLLECTION</h1>
      </div>
      <div style="padding:20px">
        <h2 style="color:#62221C">Новое сообщение с формы обратной связи</h2>
        <p style="color:#666;font-size:13px">Получено: ${date} (МСК)</p>
        <p><strong>Имя:</strong> ${escapeHtml(fb.name)}</p>
        <p><strong>Телефон:</strong> <a href="tel:${escapeHtml(fb.phone)}">${escapeHtml(fb.phone)}</a></p>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
        <p style="white-space:pre-wrap;line-height:1.5">${messageHtml}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0 16px">
        <p style="font-size:12px;color:#888">
          Просмотреть и ответить можно в админке:
          <a href="https://vipcoll.ru/admin/feedback">vipcoll.ru/admin/feedback</a>
        </p>
      </div>
      <div style="background:#f5f5f5;padding:15px;text-align:center;font-size:12px;color:#666">
        VIP COLLECTION — Чемоданы и аксессуары для путешествий
      </div>
    </div>
  `;
}

export async function sendFeedbackEmail(fb: FeedbackEmailData): Promise<void> {
  const smtp = await getSmtpConfig();
  const adminEmails = await getAdminEmails();

  if (!smtp.smtp_host || !smtp.smtp_user || !smtp.smtp_pass) {
    console.log('SMTP not configured, skipping feedback email');
    return;
  }
  if (adminEmails.length === 0) {
    console.warn('No admin email configured — cannot send feedback notification');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtp.smtp_host,
    port: parseInt(smtp.smtp_port || '587'),
    secure: smtp.smtp_port === '465',
    auth: { user: smtp.smtp_user, pass: smtp.smtp_pass },
  });

  const from = smtp.smtp_from || smtp.smtp_user;

  try {
    await transporter.sendMail({
      from,
      to: adminEmails,
      subject: `Новое обращение: ${fb.name} — VIP COLLECTION`,
      html: buildFeedbackHtml(fb),
    });
    console.log(`Feedback notification sent to ${adminEmails.join(', ')}`);
  } catch (e) {
    console.error('Failed to send feedback email:', e);
  }
}

// ──────────────────────────────────────────────────────────────
// Уведомление о заявке от оптовика
// ──────────────────────────────────────────────────────────────

interface WholesaleRequestEmailData {
  name: string;
  companyName: string;
  phone: string;
  email: string | null;
  city: string | null;
  message: string;
  receivedAt: Date;
}

function buildWholesaleHtml(w: WholesaleRequestEmailData): string {
  const date = w.receivedAt.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
  const messageHtml = escapeHtml(w.message).replace(/\n/g, '<br>');
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#62221C;color:white;padding:20px;text-align:center">
        <h1 style="margin:0;font-size:20px">VIP COLLECTION</h1>
      </div>
      <div style="padding:20px">
        <h2 style="color:#62221C">Заявка от оптового партнёра</h2>
        <p style="color:#666;font-size:13px">Получено: ${date} (МСК)</p>
        <p><strong>Компания:</strong> ${escapeHtml(w.companyName)}</p>
        <p><strong>Контактное лицо:</strong> ${escapeHtml(w.name)}</p>
        <p><strong>Телефон:</strong> <a href="tel:${escapeHtml(w.phone)}">${escapeHtml(w.phone)}</a></p>
        ${w.email ? `<p><strong>Email:</strong> <a href="mailto:${escapeHtml(w.email)}">${escapeHtml(w.email)}</a></p>` : ''}
        ${w.city ? `<p><strong>Город:</strong> ${escapeHtml(w.city)}</p>` : ''}
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
        <p style="white-space:pre-wrap;line-height:1.5">${messageHtml}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0 16px">
        <p style="font-size:12px;color:#888">
          Просмотреть и ответить:
          <a href="https://vipcoll.ru/admin/wholesale-requests">vipcoll.ru/admin/wholesale-requests</a>
        </p>
      </div>
      <div style="background:#f5f5f5;padding:15px;text-align:center;font-size:12px;color:#666">
        VIP COLLECTION — оптовое сотрудничество
      </div>
    </div>
  `;
}

export async function sendWholesaleRequestEmail(w: WholesaleRequestEmailData): Promise<void> {
  const smtp = await getSmtpConfig();
  const adminEmails = await getAdminEmails();

  if (!smtp.smtp_host || !smtp.smtp_user || !smtp.smtp_pass) {
    console.log('SMTP not configured, skipping wholesale email');
    return;
  }
  if (adminEmails.length === 0) {
    console.warn('No admin email configured — cannot send wholesale notification');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtp.smtp_host,
    port: parseInt(smtp.smtp_port || '587'),
    secure: smtp.smtp_port === '465',
    auth: { user: smtp.smtp_user, pass: smtp.smtp_pass },
  });

  const from = smtp.smtp_from || smtp.smtp_user;

  try {
    await transporter.sendMail({
      from,
      to: adminEmails,
      subject: `Опт: ${w.companyName} — VIP COLLECTION`,
      html: buildWholesaleHtml(w),
    });
    console.log(`Wholesale request email sent to ${adminEmails.join(', ')}`);
  } catch (e) {
    console.error('Failed to send wholesale email:', e);
  }
}
