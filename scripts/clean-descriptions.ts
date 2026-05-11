/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import { cleanDescription } from '../src/lib/clean-description';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, description: true },
  });
  console.log(`Loaded ${products.length} products`);

  let cleaned = 0, unchanged = 0;
  for (const p of products) {
    const next = cleanDescription(p.description || '');
    if (next === p.description) {
      unchanged++;
      continue;
    }
    await prisma.product.update({ where: { id: p.id }, data: { description: next } });
    cleaned++;
    const diff = (p.description?.length ?? 0) - next.length;
    console.log(`  ~ ${p.name.slice(0, 60)} | -${diff} chars`);
  }

  console.log(`\nDone. cleaned=${cleaned}, unchanged=${unchanged}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
