import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const showAll = req.nextUrl.searchParams.get('all') === 'true';
  const where = showAll ? {} : { isActive: true };

  const banners = await prisma.banner.findMany({
    where,
    orderBy: { sortOrder: 'asc' },
  });
  return NextResponse.json(banners);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const data = await req.json();
  const banner = await prisma.banner.create({ data });
  return NextResponse.json(banner, { status: 201 });
}
