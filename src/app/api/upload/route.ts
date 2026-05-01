import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Files are saved OUTSIDE /public so they are accessible immediately
// without restarting Next.js. Nginx serves /uploads/ directly from disk.
const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_FOLDERS = ['banners', 'banners/desktop', 'banners/mobile', 'products', 'categories', 'brands'];

function safeFileName(name: string): string {
  const ext = path.extname(name).toLowerCase();
  const base = path
    .basename(name, ext)
    .replace(/[^\w\-]+/g, '_')
    .slice(0, 60);
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${base || 'file'}-${stamp}-${rand}${ext}`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const folderRaw = (formData.get('folder') as string | null) || 'banners';
  const folder = ALLOWED_FOLDERS.includes(folderRaw) ? folderRaw : 'banners';

  if (!file) return NextResponse.json({ error: 'Файл не передан' }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Поддерживаются только JPG, PNG, WebP, AVIF' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Размер файла больше 10 МБ' }, { status: 400 });
  }

  const targetDir = path.join(UPLOAD_ROOT, folder);
  await mkdir(targetDir, { recursive: true });

  const fileName = safeFileName(file.name);
  const targetPath = path.join(targetDir, fileName);

  const arrayBuffer = await file.arrayBuffer();
  await writeFile(targetPath, Buffer.from(arrayBuffer));

  const url = `/uploads/${folder}/${fileName}`.replace(/\\/g, '/');
  return NextResponse.json({ url, fileName, size: file.size }, { status: 201 });
}
