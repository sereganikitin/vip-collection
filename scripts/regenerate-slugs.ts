/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import { makeEnglishSlug } from '../src/lib/slug';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    include: { brand: true },
  });
  console.log(`Loaded ${products.length} products`);

  let renamed = 0, kept = 0, collisions = 0;
  const usedSlugs = new Set<string>();

  for (const p of products) {
    const stableKey = p.externalUrl || p.id;
    let newSlug = makeEnglishSlug({
      name: p.name,
      brand: p.brand.name,
      categoryId: p.categoryId,
      stableKey,
    });

    // Avoid collisions in case two products would produce the same slug
    let candidate = newSlug;
    let n = 2;
    while (usedSlugs.has(candidate)) {
      candidate = `${newSlug}-${n++}`;
      collisions++;
    }
    newSlug = candidate;
    usedSlugs.add(newSlug);

    if (p.slug === newSlug) {
      kept++;
      continue;
    }

    try {
      await prisma.product.update({
        where: { id: p.id },
        data: { slug: newSlug },
      });
      renamed++;
      console.log(`  ${p.slug.slice(0, 40)}  →  ${newSlug}`);
    } catch (e) {
      console.error(`  ✗ ${p.slug}: ${(e as Error).message}`);
    }
  }

  console.log(`\nDone. renamed=${renamed}, kept=${kept}, collisionsResolved=${collisions}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
