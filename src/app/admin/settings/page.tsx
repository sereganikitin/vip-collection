'use client';

import AdminNav from '@/components/admin/AdminNav';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LogOut, ArrowLeft, Save, CheckCircle, Send, AlertCircle } from 'lucide-react';

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
  // yandex delivery
  yd_token: string;
  yd_geocoder_key: string;
  yd_pickup_address: string;
  yd_pickup_lat: string;
  yd_pickup_lng: string;
  yd_pickup_contact_name: string;
  yd_pickup_contact_phone: string;
  // yandex delivery — russia (Platform API)
  yd_russia_token: string;
  yd_russia_station_id: string;
  // СДЭК (CDEK API v2)
  cdek_account: string;
  cdek_password: string;
  cdek_test_mode: string;     // 'true' | 'false'
  cdek_sender_city_code: string;
  cdek_sender_address: string;
  cdek_tariff_pickup: string;
  cdek_tariff_door: string;
  // Бесплатная доставка по Москве от X ₽ (0 = выключено)
  free_delivery_moscow_amount: string;
}

const EMPTY: FormState = {
  admin_email: 'k959em177@gmail.com',
  smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_from: '',
  tg_bot_token: '', tg_chat_id: '',
  tinkoff_terminal_key: '', tinkoff_password: '',
  yd_token: '', yd_geocoder_key: '',
  yd_pickup_address: 'г. Москва',
  yd_pickup_lat: '55.708', yd_pickup_lng: '37.6906',
  yd_pickup_contact_name: 'VIP COLLECTION',
  yd_pickup_contact_phone: '+79257437135',
  yd_russia_token: '',
  yd_russia_station_id: '',
  cdek_account: '',
  cdek_password: '',
  cdek_test_mode: 'false',
  cdek_sender_city_code: '44',
  cdek_sender_address: 'Москва, Ташкентская ул., 28, стр. 1, этаж 2',
  cdek_tariff_pickup: '136',
  cdek_tariff_door: '137',
  free_delivery_moscow_amount: '20000',
  contact_phone: '+79257437135',
  contact_phone_display: '+7 (925) 743-71-35',
  contact_email: 'vipshopp@yandex.ru',
  contact_telegram_url: 'https://t.me/VIP_CHEMODAN',
  contact_telegram_username: '@VIP_CHEMODAN',
  contact_whatsapp_url: 'https://wa.me/79257437135',
  contact_address_full: 'г. Москва',
  contact_address_short: 'Москва',
  contact_postal_code: '',
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
  const [tgTesting, setTgTesting] = useState(false);
  const [tgTestResult, setTgTestResult] = useState<{
    ok: boolean;
    botUsername?: string;
    chatId?: string;
    error?: string;
    hint?: string | null;
    step?: string;
  } | null>(null);

  async function testTelegram() {
    setTgTesting(true);
    setTgTestResult(null);
    try {
      // Сохраняем текущее состояние формы перед тестом, иначе test читает
      // из БД старое значение, а пользователь думает что тестит то, что в поле.
      await persistSettings();
      const res = await fetch('/api/settings/telegram-test', { method: 'POST' });
      const data = await res.json();
      setTgTestResult(data);
    } catch (e) {
      setTgTestResult({ ok: false, error: String(e) });
    } finally {
      setTgTesting(false);
    }
  }

  const [cdekTesting, setCdekTesting] = useState(false);
  const [cdekTestResult, setCdekTestResult] = useState<{
    ok: boolean;
    env?: string;
    sender?: { code: number; address: string };
    moscowFound?: { code: number; city: string; region?: string };
    tariffs?: { pickup: number; door: number };
    error?: string;
    step?: string;
  } | null>(null);

  async function testCdek() {
    setCdekTesting(true);
    setCdekTestResult(null);
    try {
      await persistSettings();
      const res = await fetch('/api/settings/cdek-test', { method: 'POST' });
      const data = await res.json();
      setCdekTestResult(data);
    } catch (e) {
      setCdekTestResult({ ok: false, error: String(e) });
    } finally {
      setCdekTesting(false);
    }
  }

  // Редирект на /admin/login если не аутентифицирован — отдельный эффект,
  // не должен дёргать загрузку настроек.
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/admin/login');
  }, [status, router]);

  // Настройки загружаем ОДИН РАЗ при первой аутентификации, потом не трогаем.
  // Раньше эффект перезагружал /api/settings при каждом ре-рендере, который
  // приходил из next-auth (сессия валидируется на фокус вкладки и каждые
  // 5 минут). В результате незасохранённый токен в форме затирался старым
  // значением из БД, и пользователь видел как поле «укорачивается на глазах».
  const settingsLoadedRef = useRef(false);
  useEffect(() => {
    if (status !== 'authenticated' || settingsLoadedRef.current) return;
    settingsLoadedRef.current = true;
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setForm((prev) => ({ ...prev, ...data }));
        }
      });
  }, [status]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Сохраняем текущее состояние формы в БД. Используется и при явном
  // нажатии «Сохранить», и автоматически перед тестами (чтобы пользователь
  // не думал «а почему тест читает старое значение, я же только что вписал»).
  async function persistSettings(): Promise<void> {
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await persistSettings();
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

      <AdminNav current="settings" />

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
                <input className={fieldClass} value={form.contact_postal_code} onChange={(e) => set('contact_postal_code', e.target.value)} placeholder="" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Адрес (полный)</label>
                <input className={fieldClass} value={form.contact_address_full} onChange={(e) => set('contact_address_full', e.target.value)} placeholder="г. Москва" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Адрес (короткий, для футера)</label>
                <input className={fieldClass} value={form.contact_address_short} onChange={(e) => set('contact_address_short', e.target.value)} placeholder="г. Москва" />
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
              <input
                className={fieldClass}
                type="text"
                value={form.admin_email}
                onChange={(e) => set('admin_email', e.target.value)}
                placeholder="admin@example.com, второй@example.com"
                required
              />
              <p className="text-xs text-text-muted mt-1">
                На этот адрес приходят уведомления о новых заказах. Можно указать несколько
                адресов через запятую — каждый получит копию письма.
              </p>
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
                <label className="block text-sm font-medium mb-1">
                  Токен бота
                  {form.tg_bot_token && (
                    <span className={`ml-2 text-xs font-normal ${
                      form.tg_bot_token.length < 30 ? 'text-danger' : 'text-text-muted'
                    }`}>
                      ({form.tg_bot_token.length} символов{form.tg_bot_token.length < 30 ? ' — слишком короткий, нормальный токен ≥45 символов' : ''})
                    </span>
                  )}
                </label>
                <input
                  className={fieldClass}
                  type="text"
                  value={form.tg_bot_token}
                  onChange={(e) => set('tg_bot_token', e.target.value)}
                  placeholder="1234567890:AAA..."
                  // type="text" + явные anti-autofill хинты, чтобы Chrome не
                  // подменял свежий вставленный токен на короткий, сохранённый
                  // в его менеджере паролей с прошлых неудачных попыток.
                  autoComplete="off"
                  spellCheck={false}
                  data-1p-ignore="true"
                  data-bwignore="true"
                  data-lpignore="true"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Chat ID</label>
                <input className={fieldClass} value={form.tg_chat_id} onChange={(e) => set('tg_chat_id', e.target.value)} placeholder="например, 123456789 или -1001234567890 для группы" />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <button
                type="button"
                onClick={testTelegram}
                disabled={tgTesting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-bg border border-border rounded-lg hover:border-accent hover:text-accent transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Send size={14} />
                {tgTesting ? 'Отправляем…' : 'Отправить тестовое сообщение'}
              </button>
              <p className="text-xs text-text-muted mt-2">
                Сначала сохраните токен и chat_id, потом нажмите кнопку.
                Бот должен прислать сообщение в чат — если не пришло, причина будет ниже.
              </p>

              {tgTestResult && (
                <div
                  className={`mt-3 p-3 rounded-lg text-sm flex items-start gap-2 ${
                    tgTestResult.ok
                      ? 'bg-green-50 border border-green-200 text-green-900'
                      : 'bg-red-50 border border-red-200 text-red-900'
                  }`}
                >
                  {tgTestResult.ok ? (
                    <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    {tgTestResult.ok ? (
                      <>
                        <p className="font-medium">Тестовое сообщение отправлено ✓</p>
                        <p className="text-xs mt-1 opacity-80">
                          Бот: @{tgTestResult.botUsername} → чат {tgTestResult.chatId}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium">Не удалось отправить{tgTestResult.step ? ` (${tgTestResult.step})` : ''}</p>
                        <p className="text-xs mt-1 break-words">{tgTestResult.error}</p>
                        {tgTestResult.hint && (
                          <p className="text-xs mt-2 italic opacity-80">{tgTestResult.hint}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
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

          {/* Yandex Delivery */}
          <div className="bg-surface rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-1">Яндекс Доставка</h3>
            <p className="text-xs text-text-muted mb-4">
              Расчёт стоимости и создание заявок на курьерскую доставку (Москва) и доставку по России.
              Сейчас интеграция работает только в админке заказов (вручную); в чекауте на сайте — будет добавлено позже.
              <br /><br />
              <strong>Где взять токен:</strong> ЛК Я.Доставки → «API» → создать OAuth-токен.
              <br />
              <strong>Где взять ключ Геокодера:</strong> developer.tech.yandex.ru → «Геокодер JS API» (бесплатно, 25 000 запросов/сутки).
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">OAuth-токен Я.Доставки</label>
                <input className={fieldClass} type="password" value={form.yd_token} onChange={(e) => set('yd_token', e.target.value)} placeholder="y0_AgAAAAA..." autoComplete="off" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Ключ Я.Геокодера</label>
                <input className={fieldClass} type="password" value={form.yd_geocoder_key} onChange={(e) => set('yd_geocoder_key', e.target.value)} placeholder="abcd1234-xxxx-..." autoComplete="off" />
              </div>
            </div>

            <h4 className="font-medium text-sm mt-5 mb-2">Пункт забора (склад)</h4>
            <p className="text-xs text-text-muted mb-3">
              Откуда курьер забирает товар. Координаты — для точного расчёта (latitude, longitude).
              Подсмотреть можно в Яндекс Картах: правый клик на точку → «Что здесь?» → скопировать.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Адрес</label>
                <input className={fieldClass} value={form.yd_pickup_address} onChange={(e) => set('yd_pickup_address', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Широта (lat)</label>
                <input className={fieldClass} value={form.yd_pickup_lat} onChange={(e) => set('yd_pickup_lat', e.target.value)} placeholder="55.708" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Долгота (lng)</label>
                <input className={fieldClass} value={form.yd_pickup_lng} onChange={(e) => set('yd_pickup_lng', e.target.value)} placeholder="37.6906" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Контактное имя</label>
                <input className={fieldClass} value={form.yd_pickup_contact_name} onChange={(e) => set('yd_pickup_contact_name', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Контактный телефон</label>
                <input className={fieldClass} value={form.yd_pickup_contact_phone} onChange={(e) => set('yd_pickup_contact_phone', e.target.value)} placeholder="+79257437135" />
              </div>
            </div>

            <h4 className="font-medium text-sm mt-6 mb-2">Доставка по России (Platform)</h4>
            <p className="text-xs text-text-muted mb-3">
              Хост: <span className="font-mono">b2b.taxi.yandex.net/api/b2b/platform/…</span>.
              На текущем аккаунте эмпирически подтверждено: Cargo возвращает <em>suitable_offer_not_found</em>,
              а Platform даёт офферы и список ПВЗ.
              <br /><br />
              Оба поля ниже <strong>обязательны</strong>. Если хотя бы одно пустое — расчёт стоимости вернёт
              ошибку «не настроена». Дефолтов нет: подставлять чужую станцию запрещено (Я.Доставка отдаст 403).
              <br /><br />
              <strong>Где взять <span className="font-mono">platform_station_id</span>:</strong>
              в вашем ЛК Я.Доставки → Профиль → Точки приёма (или Pickup-points) добавьте свою станцию для
              адреса физического склада-источника, и Яндекс выдаст её id вида
              <span className="font-mono"> 019xxxxxxxxxxxxxxxxxxxxxxxxxxxxx</span>.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Токен Platform (y0_…) <span className="text-danger">*</span></label>
                <input
                  className={fieldClass}
                  type="password"
                  value={form.yd_russia_token}
                  onChange={(e) => set('yd_russia_token', e.target.value)}
                  placeholder="y0_AgAAA..."
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">platform_station_id вашего склада <span className="text-danger">*</span></label>
                <input
                  className={fieldClass}
                  value={form.yd_russia_station_id}
                  onChange={(e) => set('yd_russia_station_id', e.target.value)}
                  placeholder="019..."
                />
              </div>
            </div>

            <h4 className="font-medium text-sm mt-6 mb-2">СДЭК (CDEK API v2)</h4>
            <p className="text-xs text-text-muted mb-3">
              Вторая ветка доставки по России. На чекауте мы опрашиваем Я.Доставку и СДЭК
              параллельно, мерджим офферы и предлагаем покупателю минимальный.
              <br />
              Креды берутся из вашего ЛК на <span className="font-mono">cdek.ru</span> → Профиль → API
              (поля «Аккаунт» и «Secure Password»). Боевой контур — <span className="font-mono">api.cdek.ru</span>,
              тестовый — <span className="font-mono">api.edu.cdek.ru</span>.
            </p>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.cdek_test_mode === 'true'}
                  onChange={(e) => set('cdek_test_mode', e.target.checked ? 'true' : 'false')}
                  className="accent-accent"
                />
                <span>Тестовый контур (api.edu.cdek.ru)</span>
              </label>
              <div>
                <label className="block text-sm font-medium mb-1">Account (логин API)</label>
                <input
                  className={fieldClass}
                  type="password"
                  value={form.cdek_account}
                  onChange={(e) => set('cdek_account', e.target.value)}
                  placeholder="wVYxogtXTpa8nQpl..."
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Secure password</label>
                <input
                  className={fieldClass}
                  type="password"
                  value={form.cdek_password}
                  onChange={(e) => set('cdek_password', e.target.value)}
                  placeholder="2mbW3dKYJyZm4d7n..."
                  autoComplete="off"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Код города отправителя</label>
                  <input
                    className={fieldClass}
                    inputMode="numeric"
                    value={form.cdek_sender_city_code}
                    onChange={(e) => set('cdek_sender_city_code', e.target.value.replace(/\D/g, ''))}
                    placeholder="44 (Москва)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Адрес отправителя</label>
                  <input
                    className={fieldClass}
                    value={form.cdek_sender_address}
                    onChange={(e) => set('cdek_sender_address', e.target.value)}
                    placeholder="Москва, Ташкентская 28, стр. 1"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tariff code для ПВЗ-получателя
                  </label>
                  <input
                    className={fieldClass}
                    inputMode="numeric"
                    value={form.cdek_tariff_pickup}
                    onChange={(e) => set('cdek_tariff_pickup', e.target.value.replace(/\D/g, ''))}
                    placeholder="136"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tariff code для двери получателя
                  </label>
                  <input
                    className={fieldClass}
                    inputMode="numeric"
                    value={form.cdek_tariff_door}
                    onChange={(e) => set('cdek_tariff_door', e.target.value.replace(/\D/g, ''))}
                    placeholder="137"
                  />
                </div>
              </div>
              <p className="text-[11px] text-text-muted">
                Дефолтные тарифы: <span className="font-mono">136</span> (Посылка склад-склад) и
                <span className="font-mono"> 137</span> (Посылка склад-дверь). Если в вашем договоре
                с СДЭК другие — впишите их сюда.
              </p>

              <button
                type="button"
                onClick={testCdek}
                disabled={cdekTesting}
                className="mt-2 px-3 py-1.5 text-xs bg-bg border border-border rounded-lg hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
              >
                {cdekTesting ? 'Проверяем…' : 'Тест СДЭК (OAuth + поиск города)'}
              </button>
              {cdekTestResult && (
                <div className={`mt-2 p-3 rounded-lg text-xs ${
                  cdekTestResult.ok ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                }`}>
                  {cdekTestResult.ok ? (
                    <>
                      ✅ Креды работают. Контур: <strong>{cdekTestResult.env}</strong>.
                      Отправитель: код <strong>{cdekTestResult.sender?.code}</strong>,{' '}
                      {cdekTestResult.sender?.address}.{' '}
                      «Москва» резолвится в код <strong>{cdekTestResult.moscowFound?.code}</strong>.
                      Тарифы: pickup <strong>{cdekTestResult.tariffs?.pickup}</strong>, door{' '}
                      <strong>{cdekTestResult.tariffs?.door}</strong>.
                    </>
                  ) : (
                    <>
                      ❌ {cdekTestResult.step ? `(${cdekTestResult.step}) ` : ''}
                      {cdekTestResult.error}
                    </>
                  )}
                </div>
              )}
            </div>

            <h4 className="font-medium text-sm mt-6 mb-2">Бесплатная доставка</h4>
            <p className="text-xs text-text-muted mb-3">
              Если сумма заказа (без учёта доставки) ≥ указанной — стоимость доставки по Москве
              автоматически становится <strong>0 ₽</strong>. Применяется к ОБОИМ перевозчикам
              (Я.Доставка и СДЭК) и в чекауте, и при пересчёте в админке.
              <br />
              Поставьте <span className="font-mono">0</span>, чтобы выключить правило.
            </p>
            <div>
              <label className="block text-sm font-medium mb-1">Порог бесплатной доставки по Москве, ₽</label>
              <input
                className={fieldClass}
                type="text"
                inputMode="numeric"
                value={form.free_delivery_moscow_amount}
                onChange={(e) => set('free_delivery_moscow_amount', e.target.value.replace(/\D/g, ''))}
                placeholder="20000"
              />
            </div>
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
