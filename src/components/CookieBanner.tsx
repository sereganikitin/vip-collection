'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

const STORAGE_KEY = 'vipcoll_cookie_consent_v1';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // localStorage disabled — silently hide
    }
  }, []);

  function accept() {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50 bg-primary text-white shadow-2xl rounded-xl p-4 border border-white/10">
      <div className="flex items-start gap-3">
        <p className="text-sm flex-1 leading-relaxed">
          Сайт использует cookie для корректной работы корзины и сбора анонимной статистики.
          Продолжая пользоваться сайтом, вы соглашаетесь с{' '}
          <Link href="/privacy" className="text-accent hover:underline">Политикой обработки персональных данных</Link>.
        </p>
        <button
          onClick={accept}
          aria-label="Принять и закрыть"
          className="text-white/70 hover:text-white transition-colors flex-shrink-0"
        >
          <X size={18} />
        </button>
      </div>
      <button
        onClick={accept}
        className="mt-3 w-full py-2 bg-accent text-primary font-semibold rounded-lg text-sm hover:bg-accent-hover transition-colors"
      >
        Принять
      </button>
    </div>
  );
}
