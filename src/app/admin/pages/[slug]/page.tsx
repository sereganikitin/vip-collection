'use client';

import AdminNav from '@/components/admin/AdminNav';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  LogOut, ArrowLeft, Save, Check, Plus, Trash2, RotateCcw, ExternalLink,
} from 'lucide-react';
import { EDITABLE_PAGES, ALLOWED_ICONS, type PageSection } from '@/lib/page-defaults';
import { renderMarkdown } from '@/lib/markdown';

interface FormState {
  title: string;
  intro: string;
  sections: PageSection[];
  body: string;
  faq: { q: string; a: string }[];
}

const EMPTY: FormState = { title: '', intro: '', sections: [], body: '', faq: [] };

export default function AdminPageEditor() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const slug = String(params?.slug ?? '');

  const meta = EDITABLE_PAGES.find((p) => p.slug === slug);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pages/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setForm({
          title: data.title ?? '',
          intro: data.intro ?? '',
          sections: Array.isArray(data.sections) ? data.sections : [],
          body: data.body ?? '',
          faq: Array.isArray(data.faq) ? data.faq : [],
        });
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/admin/login');
    if (status === 'authenticated' && meta) load();
  }, [status, router, meta, load]);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/pages/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`Ошибка сохранения: ${data.error || res.statusText}`);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      alert(`Ошибка: ${String(e)}`);
    } finally {
      setSaving(false);
    }
  }

  async function resetToDefault() {
    if (!confirm('Сбросить страницу к исходному тексту? Все ваши правки будут потеряны.')) return;
    await fetch(`/api/pages/${slug}`, { method: 'DELETE' });
    await load();
  }

  function updateSection(i: number, patch: Partial<PageSection>) {
    setForm((p) => ({
      ...p,
      sections: p.sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));
  }
  function addSection() {
    setForm((p) => ({ ...p, sections: [...p.sections, { title: '', body: '' }] }));
  }
  function removeSection(i: number) {
    setForm((p) => ({ ...p, sections: p.sections.filter((_, idx) => idx !== i) }));
  }
  function moveSection(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= form.sections.length) return;
    const next = [...form.sections];
    [next[i], next[j]] = [next[j], next[i]];
    setForm((p) => ({ ...p, sections: next }));
  }

  function updateFaq(i: number, patch: Partial<{ q: string; a: string }>) {
    setForm((p) => ({
      ...p,
      faq: p.faq.map((f, idx) => (idx === i ? { ...f, ...patch } : f)),
    }));
  }
  function addFaq() {
    setForm((p) => ({ ...p, faq: [...p.faq, { q: '', a: '' }] }));
  }
  function removeFaq(i: number) {
    setForm((p) => ({ ...p, faq: p.faq.filter((_, idx) => idx !== i) }));
  }

  if (status !== 'authenticated') {
    return <div className="min-h-screen flex items-center justify-center">Загрузка…</div>;
  }
  if (!meta) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Неизвестная страница: {slug}
      </div>
    );
  }

  const field = 'w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent bg-surface';
  const textarea = 'w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent bg-surface font-mono resize-y';

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-primary text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">VIP COLLECTION</h1>
            <p className="text-sm text-gray-300">Панель администратора</p>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/admin/login' })} className="flex items-center gap-1 text-sm text-gray-300 hover:text-white">
            <LogOut size={16} /> Выйти
          </button>
        </div>
      </header>

      <AdminNav current="pages" />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Link href="/admin/pages" className="text-text-muted hover:text-text"><ArrowLeft size={20} /></Link>
          <h2 className="text-2xl font-bold">Страница: {meta.label}</h2>
          <a
            href={`/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 inline-flex items-center gap-1 text-sm text-accent hover:underline"
          >
            <ExternalLink size={14} /> Посмотреть на сайте
          </a>
        </div>

        {loading ? (
          <div className="bg-surface border border-border rounded-xl p-10 text-center text-text-muted">
            Загрузка…
          </div>
        ) : (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 mb-6">
              <strong>Markdown подсказки:</strong>
              <code className="ml-2">**жирный**</code>
              <code className="ml-2">*курсив*</code>
              <code className="ml-2">## Заголовок H2</code>
              <code className="ml-2">### Заголовок H3</code>
              <code className="ml-2">- пункт</code>
              <code className="ml-2">[текст](https://...)</code>
            </div>

            {/* Title */}
            <section className="bg-surface rounded-xl border border-border p-5 mb-5">
              <label className="block text-sm font-medium mb-2">Заголовок страницы (H1)</label>
              <input
                className={field}
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </section>

            {/* Intro */}
            <MarkdownField
              label="Вводный текст"
              hint="Отображается под H1. Можно использовать **жирный**, ссылки, списки."
              value={form.intro}
              onChange={(v) => setForm((p) => ({ ...p, intro: v }))}
              textareaClass={textarea}
              rows={4}
            />

            {/* Sections */}
            <section className="bg-surface rounded-xl border border-border p-5 mb-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold">Блоки / секции</h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Карточки с иконкой и заголовком. Например, способы доставки или виды работ.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addSection}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-accent text-primary text-xs font-medium rounded-lg hover:bg-accent-hover transition-colors"
                >
                  <Plus size={14} /> Добавить блок
                </button>
              </div>

              {form.sections.length === 0 ? (
                <p className="text-sm text-text-muted">Блоков нет</p>
              ) : (
                <div className="space-y-4">
                  {form.sections.map((s, i) => (
                    <div key={i} className="border border-border rounded-lg p-4 bg-bg">
                      <div className="flex items-start gap-3 mb-3 flex-wrap">
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-xs font-medium mb-1 text-text-muted">Иконка (необязательно)</label>
                          <select
                            className={field}
                            value={s.icon ?? ''}
                            onChange={(e) => updateSection(i, { icon: e.target.value || undefined })}
                          >
                            <option value="">— нет —</option>
                            {ALLOWED_ICONS.map((ic) => (
                              <option key={ic} value={ic}>{ic}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-[2] min-w-[300px]">
                          <label className="block text-xs font-medium mb-1 text-text-muted">Заголовок блока</label>
                          <input
                            className={field}
                            value={s.title}
                            onChange={(e) => updateSection(i, { title: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col gap-1 pt-5">
                          <button
                            type="button"
                            onClick={() => moveSection(i, -1)}
                            disabled={i === 0}
                            className="text-text-muted hover:text-text disabled:opacity-30 text-xs"
                          >▲</button>
                          <button
                            type="button"
                            onClick={() => moveSection(i, 1)}
                            disabled={i === form.sections.length - 1}
                            className="text-text-muted hover:text-text disabled:opacity-30 text-xs"
                          >▼</button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSection(i)}
                          className="text-danger hover:bg-danger/10 rounded p-2 mt-4"
                          aria-label="Удалить блок"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <label className="block text-xs font-medium mb-1 text-text-muted">Содержимое (Markdown)</label>
                      <div className="grid md:grid-cols-2 gap-3">
                        <textarea
                          rows={5}
                          className={textarea}
                          value={s.body}
                          onChange={(e) => updateSection(i, { body: e.target.value })}
                        />
                        <div className="border border-border rounded-lg p-3 bg-white text-sm space-y-2 overflow-auto max-h-[200px]">
                          {renderMarkdown(s.body) ?? <span className="text-text-muted text-xs">Превью пусто</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Body */}
            <MarkdownField
              label="Основной текст"
              hint="Размещается под блоками. Любой markdown — заголовки H2/H3, абзацы, списки."
              value={form.body}
              onChange={(v) => setForm((p) => ({ ...p, body: v }))}
              textareaClass={textarea}
              rows={10}
            />

            {/* FAQ */}
            <section className="bg-surface rounded-xl border border-border p-5 mb-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold">Частые вопросы (FAQ)</h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Выводятся в конце страницы. Также передаются в поиск (FAQPage Schema).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addFaq}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-accent text-primary text-xs font-medium rounded-lg hover:bg-accent-hover transition-colors"
                >
                  <Plus size={14} /> Добавить вопрос
                </button>
              </div>

              {form.faq.length === 0 ? (
                <p className="text-sm text-text-muted">Вопросов нет</p>
              ) : (
                <div className="space-y-3">
                  {form.faq.map((f, i) => (
                    <div key={i} className="border border-border rounded-lg p-4 bg-bg">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <label className="block text-xs font-medium text-text-muted">Вопрос {i + 1}</label>
                        <button
                          type="button"
                          onClick={() => removeFaq(i)}
                          className="text-danger hover:bg-danger/10 rounded p-1"
                          aria-label="Удалить вопрос"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <input
                        className={field + ' mb-2'}
                        value={f.q}
                        placeholder="Например: Сколько стоит доставка?"
                        onChange={(e) => updateFaq(i, { q: e.target.value })}
                      />
                      <textarea
                        rows={3}
                        className={textarea}
                        placeholder="Ответ"
                        value={f.a}
                        onChange={(e) => updateFaq(i, { a: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="sticky bottom-4 bg-surface border border-border rounded-xl p-3 shadow-lg flex items-center justify-between flex-wrap gap-3">
              <button
                type="button"
                onClick={resetToDefault}
                className="inline-flex items-center gap-1 px-4 py-2 text-sm border border-border text-text-muted rounded-lg hover:border-danger hover:text-danger transition-colors"
              >
                <RotateCcw size={14} /> Сбросить к исходному
              </button>

              <div className="flex items-center gap-3">
                {saved && (
                  <span className="inline-flex items-center gap-1 text-success text-sm font-medium">
                    <Check size={14} /> Сохранено
                  </span>
                )}
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-accent text-primary font-semibold rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  <Save size={16} /> {saving ? 'Сохраняем…' : 'Сохранить'}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function MarkdownField({
  label, hint, value, onChange, textareaClass, rows,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  textareaClass: string;
  rows: number;
}) {
  return (
    <section className="bg-surface rounded-xl border border-border p-5 mb-5">
      <div className="flex items-baseline justify-between mb-2">
        <label className="block text-sm font-medium">{label}</label>
        {hint && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <textarea
          rows={rows}
          className={textareaClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="border border-border rounded-lg p-3 bg-white text-sm space-y-2 overflow-auto" style={{ minHeight: 80 }}>
          {renderMarkdown(value) ?? <span className="text-text-muted text-xs">Превью пусто</span>}
        </div>
      </div>
    </section>
  );
}
