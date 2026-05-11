/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Old (Russian transliteration) → new (English) slug, keyed by category id.
const SLUG_MAP: Record<string, { from: string; to: string }> = {
  suitcases: { from: 'chemodany', to: 'suitcases' },
  'women-bags': { from: 'sumki-zhenskie', to: 'women-bags' },
  briefcases: { from: 'portfeli', to: 'briefcases' },
  parts: { from: 'zapchasti', to: 'parts' },
  wallets: { from: 'portmone', to: 'wallets' },
  backpacks: { from: 'ryukzaki', to: 'backpacks' },
  covers: { from: 'chekhly', to: 'covers' },
  belts: { from: 'remni', to: 'belts' },
  'waist-bags': { from: 'sumki-na-poyas', to: 'waist-bags' },
  misc: { from: 'raznoe', to: 'misc' },
  sale: { from: 'rasprodazha', to: 'sale' },
};

async function main() {
  const cats = await prisma.category.findMany();
  let renamed = 0, kept = 0;

  for (const cat of cats) {
    const target = SLUG_MAP[cat.id];
    if (!target) {
      console.warn(`  ? unknown category id=${cat.id} slug=${cat.slug} (skipped)`);
      continue;
    }
    if (cat.slug === target.to) {
      kept++;
      continue;
    }
    await prisma.category.update({
      where: { id: cat.id },
      data: { slug: target.to },
    });
    renamed++;
    console.log(`  ${cat.slug}  →  ${target.to}`);
  }

  console.log(`\nDone. renamed=${renamed}, kept=${kept}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
