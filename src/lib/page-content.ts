// Чтение/запись контента редактируемых страниц.
// Сначала пробуем БД, при отсутствии записи возвращаем дефолт из page-defaults.ts.
// Это позволяет страницам работать без миграции данных — пока админ не отредактирует.

import { prisma } from '@/lib/prisma';
import { PAGE_DEFAULTS, type PageContentShape, type PageSlug, type PageSection } from './page-defaults';

function coerceShape(raw: {
  title: string;
  intro: string;
  sections: unknown;
  body: string;
  faq: unknown;
}): PageContentShape {
  const sections = Array.isArray(raw.sections) ? (raw.sections as PageSection[]) : [];
  const faq = Array.isArray(raw.faq) ? (raw.faq as { q: string; a: string }[]) : [];
  return {
    title: raw.title,
    intro: raw.intro ?? '',
    sections,
    body: raw.body ?? '',
    faq,
  };
}

export async function getPageContent(slug: PageSlug): Promise<PageContentShape> {
  try {
    const row = await prisma.pageContent.findUnique({ where: { slug } });
    if (row) {
      return coerceShape({
        title: row.title,
        intro: row.intro,
        sections: row.sections,
        body: row.body,
        faq: row.faq,
      });
    }
  } catch (e) {
    console.error(`getPageContent(${slug}): DB error, using defaults`, e);
  }
  return PAGE_DEFAULTS[slug];
}

export async function savePageContent(slug: PageSlug, content: PageContentShape) {
  return prisma.pageContent.upsert({
    where: { slug },
    create: {
      slug,
      title: content.title,
      intro: content.intro,
      sections: content.sections as unknown as object,
      body: content.body,
      faq: content.faq as unknown as object,
    },
    update: {
      title: content.title,
      intro: content.intro,
      sections: content.sections as unknown as object,
      body: content.body,
      faq: content.faq as unknown as object,
    },
  });
}

export async function resetPageContent(slug: PageSlug) {
  await prisma.pageContent.deleteMany({ where: { slug } });
}

export { PAGE_DEFAULTS, type PageContentShape, type PageSlug, type PageSection } from './page-defaults';
