// GET /api/pages/[slug]   — текущий контент (БД или дефолт), для админки.
// PUT /api/pages/[slug]   — сохранить новый контент (требует авторизации).
// DELETE /api/pages/[slug] — сбросить на дефолт (удалить строку в БД).
//
// slug должен быть из набора EDITABLE_PAGES.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getPageContent,
  savePageContent,
  resetPageContent,
} from '@/lib/page-content';
import {
  EDITABLE_PAGES,
  ALLOWED_ICONS,
  type PageSlug,
  type PageContentShape,
} from '@/lib/page-defaults';

export const dynamic = 'force-dynamic';

const VALID_SLUGS = new Set<string>(EDITABLE_PAGES.map((p) => p.slug));
const VALID_ICONS = new Set<string>(ALLOWED_ICONS);

function isValidSlug(s: string): s is PageSlug {
  return VALID_SLUGS.has(s);
}

function sanitizeContent(input: unknown): PageContentShape | string {
  if (!input || typeof input !== 'object') return 'Body must be an object';
  const i = input as Record<string, unknown>;
  if (typeof i.title !== 'string' || !i.title.trim()) return '«Заголовок» обязателен';
  const title = i.title.trim().slice(0, 200);
  const intro = typeof i.intro === 'string' ? i.intro.slice(0, 20000) : '';
  const body = typeof i.body === 'string' ? i.body.slice(0, 100000) : '';
  const sectionsRaw = Array.isArray(i.sections) ? i.sections : [];
  const sections = sectionsRaw.slice(0, 20).map((s) => {
    const sec = (s ?? {}) as Record<string, unknown>;
    const icon = typeof sec.icon === 'string' && VALID_ICONS.has(sec.icon) ? sec.icon : undefined;
    return {
      icon,
      title: String(sec.title ?? '').slice(0, 200),
      body: String(sec.body ?? '').slice(0, 20000),
    };
  });
  const faqRaw = Array.isArray(i.faq) ? i.faq : [];
  const faq = faqRaw.slice(0, 50).map((f) => {
    const item = (f ?? {}) as Record<string, unknown>;
    return {
      q: String(item.q ?? '').slice(0, 500),
      a: String(item.a ?? '').slice(0, 5000),
    };
  });
  return { title, intro, sections, body, faq };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isValidSlug(slug)) return NextResponse.json({ error: 'Unknown slug' }, { status: 404 });
  const content = await getPageContent(slug);
  return NextResponse.json(content);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;
  if (!isValidSlug(slug)) return NextResponse.json({ error: 'Unknown slug' }, { status: 404 });

  const body = await req.json();
  const cleaned = sanitizeContent(body);
  if (typeof cleaned === 'string') {
    return NextResponse.json({ error: cleaned }, { status: 400 });
  }
  await savePageContent(slug, cleaned);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;
  if (!isValidSlug(slug)) return NextResponse.json({ error: 'Unknown slug' }, { status: 404 });
  await resetPageContent(slug);
  return NextResponse.json({ ok: true });
}
