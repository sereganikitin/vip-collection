/* eslint-disable no-console */
/**
 * Показать сообщения с формы обратной связи из БД.
 * Запуск:  npx tsx scripts/list-feedback.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.feedback.count();
  console.log(`Всего сообщений в БД: ${count}`);

  if (count === 0) {
    console.log('Сообщений нет. Виджет работает, но никто пока не отправлял.');
    return;
  }

  const items = await prisma.feedback.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  console.log(`\nПоследние ${items.length} (новые сверху):`);
  for (const fb of items) {
    const date = fb.createdAt.toISOString().replace('T', ' ').slice(0, 16);
    const read = fb.isRead ? 'прочитано' : 'НОВОЕ';
    console.log(`\n[${date}]  ${read}`);
    console.log(`  Имя: ${fb.name}`);
    console.log(`  Тел: ${fb.phone}`);
    console.log(`  Текст: ${fb.message.slice(0, 200)}${fb.message.length > 200 ? '…' : ''}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
