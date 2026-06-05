'use client';

import { useState } from 'react';
import { MessageCircle, X, Send, Check } from 'lucide-react';
import { formatPhoneMask, validateRussianPhone } from '@/lib/validation';

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const phoneCheck = phone ? validateRussianPhone(phone) : null;
  const phoneError = phoneCheck && !phoneCheck.ok ? phoneCheck.error : null;

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhone(formatPhoneMask(e.target.value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const finalPhone = validateRussianPhone(phone);
    if (!finalPhone.ok) {
      setError(finalPhone.error || 'Проверьте номер телефона');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, message }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Не удалось отправить');
      }
      setSent(true);
      setName('');
      setPhone('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSending(false);
    }
  }

  function close() {
    setOpen(false);
    setError('');
    setTimeout(() => setSent(false), 300);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Написать нам"
        className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-accent text-primary rounded-full shadow-lg hover:bg-accent-hover transition-all flex items-center justify-center"
      >
        <MessageCircle size={22} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-80 max-w-[calc(100vw-2rem)] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden">
      <div className="bg-primary text-white px-4 py-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Напишите нам</h3>
          <p className="text-xs text-white/70">Ответим в рабочее время</p>
        </div>
        <button onClick={close} aria-label="Закрыть" className="text-white/70 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      {sent ? (
        <div className="p-6 text-center">
          <div className="w-12 h-12 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-3">
            <Check size={24} />
          </div>
          <p className="font-semibold mb-1">Сообщение отправлено</p>
          <p className="text-sm text-text-muted">Свяжемся в ближайшее время.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <p className="text-xs text-text-muted leading-relaxed">
            Напишите свой вопрос — мы с вами свяжемся.
          </p>
          <input
            type="text"
            placeholder="Имя"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
          />
          <input
            type="tel"
            placeholder="+7 (___) ___-__-__"
            required
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={handlePhoneChange}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none ${
              phoneError ? 'border-danger focus:border-danger' : 'border-border focus:border-accent'
            }`}
          />
          {phoneError && (
            <p className="text-xs text-danger -mt-1">{phoneError}</p>
          )}
          <textarea
            placeholder="Ваш вопрос"
            required
            rows={3}
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent resize-none"
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          <button
            type="submit"
            disabled={sending}
            className="w-full py-2.5 bg-accent text-primary font-medium rounded-lg text-sm hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Send size={14} />
            {sending ? 'Отправляем…' : 'Отправить'}
          </button>
        </form>
      )}
    </div>
  );
}
