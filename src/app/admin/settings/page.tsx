'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogOut, ArrowLeft, Save, CheckCircle } from 'lucide-react';

interface FormState {
  // notification + smtp
  admin_email: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
  // telegram bot for new-feedback / new-order notifications
  tg_bot_token: string;
  tg_chat_id: string;
  // contacts
  contact_phone: string;
  contact_phone_display: string;
  contact_email: string;
  contact_telegram_url: string;
  contact_telegram_username: string;
  contact_whatsapp_url: string;
  contact_address_full: string;
  contact_address_short: string;
  contact_postal_code: string;
  contact_city: string;
  contact_hours: string;
  // legal
  legal_name: string;
  legal_full_name: string;
  legal_inn: string;
  legal_ogrnip: string;
  legal_address: string;
  // tinkoff acquiring
  tinkoff_terminal_key: string;
  tinkoff_password: string;
}

const EMPTY: FormState = {
  admin_email: 'k959em177@gmail.com',
  smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_from: '',
  tg_bot_token: '', tg_chat_id: '',
  tinkoff_terminal_key: '', tinkoff_password: '',
  contact_phone: '+79257437135',
  contact_phone_display: '+7 (925) 743-71-35',
  contact_email: 'vipshopp@yandex.ru',
  contact_telegram_url: 'https://t.me/VIP_CHEMODAN',
  contact_telegram_username: '@VIP_CHEMODAN',
  contact_whatsapp_url: 'https://wa.me/79257437135',
  contact_address_full: '115088, г. Москва, Сормовский проезд, д. 11, стр. 1',
  contact_address_short: 'Москва, Сормовский пр-д, 11, стр. 1',
  contact_postal_code: '115088',
  contact_city: 'Москва',
  contact_hours: 'Пн–Пт 10:00–18:00, по предварительной договорённости',
  legal_name: 'ИП Никитин С.В.',
  legal_full_name: 'Никитин Сергей Владимирович',
  legal_inn: '',
  legal_ogrnip: '',
  legal_address: '',
};

export default function AdminSettings() {
  const { status } = useSession();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/admin/login');
    if (status === 'authenticated') {
      fetch('/api/settings').then(r => r.json()).then(data => {
        if (data && !data.error) {
          setForm(prev => ({ ...prev, ...data }));
        }
      });
    }
  }, [status, router]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (status !== 'authenticated') {
    return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;
  }

  const fieldClass = 'w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent text-sm';

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-primary text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div><h1 className="text-xl font-bold">VIP COLLECTION</h1><p className="text-sm text-gray-300">Панель администратора</p></div>
          <button onClick={() => signOut({ callbackUrl: '/admin/login' })} className="flex items-center gap-1 text-sm text-gray-300 hover:text-white"><LogOut size={16} /> Выйти</button>
        </div>
      </header>

      <nav className="bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          <Link href="/admin" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Дашборд</Link>
          <Link href="/admin/products" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Товары</Link>
          <Link href="/admin/categories" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Категории</Link>
          <Link href="/admin/brands" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Бренды</Link>
          <Link href="/admin/orders" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Заказы</Link>
          <Link href="/admin/banners" className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text whitespace-nowrap">Баннеры</Link>
          <Link href="/admin/settings" className="px-4 py-3 text-sm font-medium text-accent border-b-2 border-accent whitespace-nowrap">Настройки</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-text-muted hover:text-text"><ArrowLeft size={20} /></Link>
          <h2 className="text-2xl font-bold">Настройки</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Контакты */}
          <div className="bg-surface rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-1">Контакты в футере и на странице «Контакты»</h3>
            <p className="text-xs text-text-muted mb-4">Эти значения подставляются автоматически везде: футер, страница контактов, юр.документы.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Телефон (tel:)</label>
                <input className={fieldClass} value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} placeholder="+79257437135" />
                <p className="text-xs text-text-muted mt-1">Без пробелов, для ссылки tel:</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Телефон (отображение)</label>
                <input className={fieldClass} value={form.contact_phone_display} onChange={(e) => set('contact_phone_display', e.target.value)} placeholder="+7 (925) 743-71-35" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input className={fieldClass} value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} placeholder="vipshopp@yandex.ru" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Город</label>
                <input className={fieldClass} value={form.contact_city} onChange={(e) => set('contact_city', e.target.value)} placeholder="Москва" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Telegram URL</label>
                <input className={fieldClass} value={form.contact_telegram_url} onChange={(e) => set('contact_telegram_url', e.target.value)} placeholder="https://t.me/..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Telegram username</label>
                <input className={fieldClass} value={form.contact_telegram_username} onChange={(e) => set('contact_telegram_username', e.target.value)} placeholder="@VIP_CHEMODAN" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">WhatsApp URL</label>
                <input className={fieldClass} value={form.contact_whatsapp_url} onChange={(e) => set('contact_whatsapp_url', e.target.value)} placeholder="https://wa.me/..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Почтовый индекс</label>
                <input className={fieldClass} value={form.contact_postal_code} onChange={(e) => set('contact_postal_code', e.target.value)} placeholder="115088" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Адрес (полный)</label>
                <input className={fieldClass} value={form.contact_address_full} onChange={(e) => set('contact_address_full', e.target.value)} placeholder="115088, г. Москва, Сормовский пр-д, д. 11, стр. 1" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Адрес (короткий, для футера)</label>
                <input className={fieldClass} value={form.contact_address_short} onChange={(e) => set('contact_address_short', e.target.value)} placeholder="Москва, Сормовский пр-д, 11, стр. 1" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Режим работы</label>
                <input className={fieldClass} value={form.contact_hours} onChange={(e) => set('contact_hours', e.target.value)} placeholder="Пн–Пт 10:00–18:00, по предварительной договорённости" />
              </div>
            </div>
          </div>

          {/* Реквизиты */}
          <div className="bg-surface rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-1">Реквизиты продавца</h3>
            <p className="text-xs text-text-muted mb-4">Используются в футере, договоре-оферте, политике обработки ПД и на странице контактов.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Юр. наименование</label>
                <input className={fieldClass} value={form.legal_name} onChange={(e) => set('legal_name', e.target.value)} placeholder="ИП Никитин С.В." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ФИО полностью</label>
                <input className={fieldClass} value={form.legal_full_name} onChange={(e) => set('legal_full_name', e.target.value)} placeholder="Никитин Сергей Владимирович" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ИНН</label>
                <input className={fieldClass} value={form.legal_inn} onChange={(e) => set('legal_inn', e.target.value)} placeholder="770000000000" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ОГРНИП</label>
                <input className={fieldClass} value={form.legal_ogrnip} onChange={(e) => set('legal_ogrnip', e.target.value)} placeholder="320000000000000" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Юридический адрес</label>
                <input className={fieldClass} value={form.legal_address} onChange={(e) => set('legal_address', e.target.value)} placeholder="Если отличается от фактического" />
              </div>
            </div>
          </div>

          {/* Уведомления */}
          <div className="bg-surface rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-4">Уведомления о заказах</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Email для уведомлений</label>
              <input className={fieldClass} type="email" value={form.admin_email} onChange={(e) => set('admin_email', e.target.value)} required />
              <p className="text-xs text-text-muted mt-1">На этот адрес приходят уведомления о новых заказах</p>
            </div>
          </div>

          {/* Telegram bot */}
          <div className="bg-surface rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-1">Уведомления в Telegram</h3>
            <p className="text-xs text-text-muted mb-4">
              Один бот для всех уведомлений: новые заказы и сообщения с формы обратной связи.
              Создайте бота через <a className="text-accent hover:underline" href="https://t.me/BotFather" target="_blank" rel="noreferrer">@BotFather</a>,
              напишите ему «/start», скопируйте токен. Чтобы узнать chat_id — напишите боту,
              затем откройте <span className="font-mono">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</span>{' '}
              и возьмите оттуда <span className="font-mono">chat.id</span>.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Токен бота</label>
                <input className={fieldClass} type="password" value={form.tg_bot_token} onChange={(e) => set('tg_bot_token', e.target.value)} placeholder="1234567890:AAA..." autoComplete="off" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Chat ID</label>
                <input className={fieldClass} value={form.tg_chat_id} onChange={(e) => set('tg_chat_id', e.target.value)} placeholder="например, 123456789 или -1001234567890 для группы" />
              </div>
            </div>
          </div>

          {/* Tinkoff Acquiring */}
          <div className="bg-surface rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-1">Тинькофф — интернет-эквайринг</h3>
            <p className="text-xs text-text-muted mb-4">
              Приём онлайн-платежей картой и СБП. Заказы со способом оплаты «онлайн» автоматически
              отправляются на страницу Тинькоффа, статус возвращается через server-to-server webhook.
              <br /><br />
              <strong>Где взять ключи:</strong> после одобрения заявки на эквайринг в ЛК Т-Бизнеса откройте
              «Интернет-эквайринг → Терминал», там <span className="font-mono">TerminalKey</span> и
              <span className="font-mono"> Password</span>. Для тестов можно использовать
              <span className="font-mono"> TinkoffBankTest</span> / <span className="font-mono">TinkoffBankTest</span>.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">TerminalKey</label>
                <input className={fieldClass} value={form.tinkoff_terminal_key} onChange={(e) => set('tinkoff_terminal_key', e.target.value)} placeholder="1234567890123" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input className={fieldClass} type="password" value={form.tinkoff_password} onChange={(e) => set('tinkoff_password', e.target.value)} autoComplete="off" placeholder="секретный пароль терминала" />
              </div>
            </div>
            <p className="text-xs text-text-muted mt-3">
              В личном кабинете Тинькоффа также пропишите Webhook URL:{' '}
              <span className="font-mono">https://vipcoll.ru/api/payment/tinkoff/notify</span>
            </p>
          </div>

          {/* SMTP */}
          <div className="bg-surface rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-4">Настройки почты (SMTP)</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">SMTP-сервер</label>
                <input className={fieldClass} value={form.smtp_host} onChange={(e) => set('smtp_host', e.target.value)} placeholder="smtp.gmail.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Порт</label>
                <input className={fieldClass} value={form.smtp_port} onChange={(e) => set('smtp_port', e.target.value)} placeholder="587" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Логин</label>
                <input className={fieldClass} value={form.smtp_user} onChange={(e) => set('smtp_user', e.target.value)} placeholder="your@gmail.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Пароль приложения</label>
                <input className={fieldClass} type="password" value={form.smtp_pass} onChange={(e) => set('smtp_pass', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Адрес отправителя</label>
                <input className={fieldClass} type="email" value={form.smtp_from} onChange={(e) => set('smtp_from', e.target.value)} placeholder="noreply@vipcoll.ru" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pb-4">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-accent text-primary font-semibold rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50">
              <Save size={18} /> {saving ? 'Сохранение...' : 'Сохранить настройки'}
            </button>
            {saved && (
              <span className="flex items-center gap-1 text-success text-sm font-medium">
                <CheckCircle size={16} /> Сохранено
              </span>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
