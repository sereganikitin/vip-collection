/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import { generateUniqueDescription } from '../src/lib/description-generator';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    include: { brand: true },
  });
  console.log(`Loaded ${products.length} products`);

  let updated = 0;
  let skipped = 0;
  for (const p of products) {
    if (p.noSync) {
      // User marked it as manually edited — don't overwrite
      skipped++;
      continue;
    }
    const next = generateUniqueDescription({
      id: p.id,
      name: p.name,
      brand: p.brand.name,
      categoryId: p.categoryId,
      price: p.price,
      oldPrice: p.oldPrice,
      specs: (p.specs as Record<string, string>) ?? null,
      externalUrl: p.externalUrl,
    });
    if (next === p.description) {
      skipped++;
      continue;
    }
    await prisma.product.update({ where: { id: p.id }, data: { description: next } });
    updated++;
    console.log(`  ~ ${p.name.slice(0, 50).padEnd(50)} | ${next.length} chars`);
  }

  console.log(`\nDone. updated=${updated}, skipped=${skipped}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
