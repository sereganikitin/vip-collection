'use client';

import { useState } from 'react';
import { Send, Check } from 'lucide-react';
import {
  formatPhoneMask,
  validateRussianPhone,
  validateEmailFormat,
} from '@/lib/validation';

export default function WholesaleForm() {
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const phoneCheck = phone ? validateRussianPhone(phone) : null;
  const emailFmt = email ? validateEmailFormat(email) : null;
  const phoneError = phoneCheck && !phoneCheck.ok ? phoneCheck.error : null;
  const emailError = emailFmt && !emailFmt.ok ? emailFmt.error : null;

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhone(formatPhoneMask(e.target.value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!consent) {
      setError('Подтвердите согласие на обработку персональных данных');
      return;
    }
    const finalPhone = validateRussianPhone(phone);
    if (!finalPhone.ok) {
      setError(finalPhone.error || 'Проверьте номер телефона');
      return;
    }
    if (email) {
      const finalEmail = validateEmailFormat(email);
      if (!finalEmail.ok) {
        setError(finalEmail.error || 'Проверьте email');
        return;
      }
    }

    setSending(true);
    try {
      const res = await fetch('/api/wholesale-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          companyName,
          phone,
          email: email || undefined,
          city: city || undefined,
          message,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Не удалось отправить');
      }
      setSent(true);
      setName('');
      setCompanyName('');
      setPhone('');
      setEmail('');
      setCity('');
      setMessage('');
      setConsent(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="bg-success/5 border border-success/30 rounded-xl p-8 text-center">
        <div className="w-14 h-14 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-4">
          <Check size={28} />
        </div>
        <h3 className="text-lg font-semibold mb-2">Заявка отправлена</h3>
        <p className="text-sm text-text-muted mb-4">
          Менеджер свяжется с вами в ближайшее время для обсуждения условий сотрудничества.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="text-sm text-accent hover:underline"
        >
          Отправить ещё одну заявку
        </button>
      </div>
    );
  }

  const field = (hasError: boolean) =>
    `w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-1 ${
      hasError
        ? 'border-danger focus:border-danger focus:ring-danger'
        : 'border-border focus:border-accent focus:ring-accent'
    }`;

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-6 md:p-8 space-y-4">
      <h2 className="text-xl md:text-2xl font-bold">Оставьте заявку</h2>
      <p className="text-sm text-text-muted">
        Заполните форму — мы свяжемся в течение рабочего дня и пришлём прайс-лист с оптовыми ценами.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Название компании / магазина *</label>
          <input
            type="text"
            required
            maxLength={200}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="ИП Иванов И.И. / ООО «Чемоданчик»"
            className={field(false)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Контактное лицо *</label>
          <input
            type="text"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Имя"
            className={field(false)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Телефон *</label>
          <input
            type="tel"
            required
            placeholder="+7 (___) ___-__-__"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={handlePhoneChange}
            className={field(!!phoneError)}
          />
          {phoneError && <p className="mt-1.5 text-xs text-danger">{phoneError}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Для прайс-листа"
            autoComplete="email"
            className={field(!!emailError)}
          />
          {emailError && <p className="mt-1.5 text-xs text-danger">{emailError}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1.5">Город</label>
          <input
            type="text"
            maxLength={100}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Москва / любой регион РФ"
            className={field(false)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1.5">
            Какие категории и объёмы вас интересуют? *
          </label>
          <textarea
            required
            rows={4}
            maxLength={4000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Например: интересуют чемоданы M и L, наборы 3-в-1, объём ~50 шт./мес."
            className={field(false) + ' resize-y'}
          />
        </div>
      </div>

      <label className="flex items-start gap-2 text-xs text-text-muted">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 accent-accent"
        />
        <span>
          Согласен на обработку персональных данных в соответствии с{' '}
          <a href="/privacy" className="text-accent hover:underline" target="_blank" rel="noreferrer">
            политикой конфиденциальности
          </a>
        </span>
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={sending}
        className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-primary font-semibold rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
      >
        <Send size={16} />
        {sending ? 'Отправляем…' : 'Отправить заявку'}
      </button>
    </form>
  );
}
