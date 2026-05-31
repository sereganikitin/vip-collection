// /indexnow-key.txt — публичный файл с IndexNow-ключом.
// Подтверждает Яндекс/Bing'у, что мы владеем этим хостом.
// Содержимое = значение INDEXNOW_KEY из env.
import { getIndexNowKey } from '@/lib/indexnow';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export function GET() {
  const key = getIndexNowKey();
  if (!key) {
    return new Response('INDEXNOW_KEY not configured', { status: 503 });
  }
  return new Response(key, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
