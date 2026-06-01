/* eslint-disable react/no-array-index-key */
// Минимальный markdown → React-рендерер. Без внешних зависимостей.
// Поддерживается:
//   - ## H2 и ### H3 (заголовки)
//   - **жирный**
//   - *курсив*
//   - [текст](url) — ссылки
//   - - элемент списка
//   - 1. нумерованный список
//   - параграфы разделяются пустой строкой
//
// Для контента админки этого достаточно: заголовки секций, выделение
// важного, списки, ссылки. Сложнее (таблицы, код) — пока не нужно.

import React from 'react';

const URL_RE = /https?:\/\/[^\s)]+/g;

function renderInline(text: string): React.ReactNode[] {
  // Парсер инлайна: **жирный**, *курсив*, [text](url) и автоссылки.
  // Работает однопроходно — разбивает строку на токены и собирает.
  const tokens: React.ReactNode[] = [];
  let rest = text;
  let key = 0;

  while (rest.length > 0) {
    // [text](url)
    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)/.exec(rest);
    if (linkMatch) {
      tokens.push(
        <a
          key={key++}
          href={linkMatch[2]}
          className="text-accent hover:underline"
          target={linkMatch[2].startsWith('http') ? '_blank' : undefined}
          rel={linkMatch[2].startsWith('http') ? 'noopener noreferrer' : undefined}
        >
          {linkMatch[1]}
        </a>
      );
      rest = rest.slice(linkMatch[0].length);
      continue;
    }
    // **bold**
    const boldMatch = /^\*\*([^*]+)\*\*/.exec(rest);
    if (boldMatch) {
      tokens.push(<strong key={key++}>{boldMatch[1]}</strong>);
      rest = rest.slice(boldMatch[0].length);
      continue;
    }
    // *italic*  (без коллизий с **)
    const italicMatch = /^\*([^*\n]+)\*/.exec(rest);
    if (italicMatch) {
      tokens.push(<em key={key++}>{italicMatch[1]}</em>);
      rest = rest.slice(italicMatch[0].length);
      continue;
    }
    // Берём следующий символ, накапливаем в текущий текст до следующего спецсимвола
    let textEnd = rest.search(/(\*|\[)/);
    if (textEnd === -1) textEnd = rest.length;
    if (textEnd === 0) textEnd = 1; // защита от бесконечного цикла
    const chunk = rest.slice(0, textEnd);
    // Раскрываем «голые» URL внутри обычного текста
    if (URL_RE.test(chunk)) {
      URL_RE.lastIndex = 0;
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = URL_RE.exec(chunk)) !== null) {
        if (m.index > last) tokens.push(chunk.slice(last, m.index));
        tokens.push(
          <a
            key={key++}
            href={m[0]}
            className="text-accent hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {m[0]}
          </a>
        );
        last = m.index + m[0].length;
      }
      if (last < chunk.length) tokens.push(chunk.slice(last));
    } else {
      tokens.push(chunk);
    }
    rest = rest.slice(textEnd);
  }

  return tokens;
}

/**
 * Преобразовать markdown-строку в React-узлы. Идёт построчно, собирает
 * параграфы, заголовки, маркированные/нумерованные списки.
 */
export function renderMarkdown(src: string): React.ReactNode {
  if (!src || !src.trim()) return null;

  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let ulItems: string[] = [];
  let olItems: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push(
        <p key={key++} className="leading-relaxed">
          {renderInline(paragraph.join(' '))}
        </p>
      );
      paragraph = [];
    }
  };
  const flushUl = () => {
    if (ulItems.length > 0) {
      blocks.push(
        <ul key={key++} className="list-disc pl-6 space-y-1.5">
          {ulItems.map((it, i) => (
            <li key={i}>{renderInline(it)}</li>
          ))}
        </ul>
      );
      ulItems = [];
    }
  };
  const flushOl = () => {
    if (olItems.length > 0) {
      blocks.push(
        <ol key={key++} className="list-decimal pl-6 space-y-1.5">
          {olItems.map((it, i) => (
            <li key={i}>{renderInline(it)}</li>
          ))}
        </ol>
      );
      olItems = [];
    }
  };
  const flushAll = () => {
    flushParagraph();
    flushUl();
    flushOl();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line === '') {
      flushAll();
      continue;
    }

    // ### H3
    if (line.startsWith('### ')) {
      flushAll();
      blocks.push(
        <h3 key={key++} className="text-lg font-semibold mt-6 mb-2">
          {renderInline(line.slice(4))}
        </h3>
      );
      continue;
    }
    // ## H2
    if (line.startsWith('## ')) {
      flushAll();
      blocks.push(
        <h2 key={key++} className="text-xl md:text-2xl font-bold mt-8 mb-3">
          {renderInline(line.slice(3))}
        </h2>
      );
      continue;
    }
    // - list item
    const ulMatch = /^[-*]\s+(.+)$/.exec(line);
    if (ulMatch) {
      flushParagraph();
      flushOl();
      ulItems.push(ulMatch[1]);
      continue;
    }
    // 1. ordered list item
    const olMatch = /^\d+\.\s+(.+)$/.exec(line);
    if (olMatch) {
      flushParagraph();
      flushUl();
      olItems.push(olMatch[1]);
      continue;
    }

    // обычный текст — собираем в параграф
    flushUl();
    flushOl();
    paragraph.push(line);
  }
  flushAll();

  return <>{blocks}</>;
}
