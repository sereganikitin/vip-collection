/* eslint-disable no-console */
/**
 * Удаление тестовых заказов из БД.
 *
 * По умолчанию работает в режиме dry-run: показывает, что было бы удалено,
 * но ничего не трогает. Чтобы реально удалить — запустить с флагом --yes:
 *
 *   npx tsx scripts/delete-test-orders.ts            # просмотр без удаления
 *   npx tsx scripts/delete-test-orders.ts --yes      # реальное удаление
 *
 * Что делает: удаляет все Order, кроме указанных в KEEP_ORDER_NUMBERS.
 * OrderItem удаляются автоматически каскадом (см. prisma/schema.prisma).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Номера заказов, которые нужно сохранить
const KEEP_ORDER_NUMBERS: number[] = [17, 18];

async function main() {
  const dryRun = !process.argv.includes('--yes');

  const all = await prisma.order.findMany({
    select: {
      id: true,
      number: true,
      customerName: true,
      customerPhone: true,
      totalPrice: true,
      paymentStatus: true,
      status: true,
      createdAt: true,
    },
    orderBy: { number: 'asc' },
  });

  const toKeep = all.filter((o) => KEEP_ORDER_NUMBERS.includes(o.number));
  const toDelete = all.filter((o) => !KEEP_ORDER_NUMBERS.includes(o.number));

  console.log('━━━ Будут СОХРАНЕНЫ ━━━');
  if (toKeep.length === 0) console.log('  (нет заказов с этими номерами)');
  for (const o of toKeep) {
    console.log(
      `  #${o.number}  ${o.customerName}  ${o.totalPrice}₽  ` +
        `[${o.status}/${o.paymentStatus}]  ${o.createdAt.toISOString().slice(0, 16)}`
    );
  }

  console.log('\n━━━ Будут УДАЛЕНЫ ━━━');
  for (const o of toDelete) {
    console.log(
      `  #${o.number}  ${o.customerName}  ${o.totalPrice}₽  ` +
        `[${o.status}/${o.paymentStatus}]  ${o.createdAt.toISOString().slice(0, 16)}`
    );
  }

  console.log(`\nИтого: оставить ${toKeep.length}, удалить ${toDelete.length}`);

  if (dryRun) {
    console.log(
      '\n[DRY RUN] Ничего не удалено. Для реального удаления:\n  npx tsx scripts/delete-test-orders.ts --yes'
    );
    return;
  }

  if (toDelete.length === 0) {
    console.log('\nНечего удалять.');
    return;
  }

  // Удаляем — OrderItem пойдут каскадом
  const result = await prisma.order.deleteMany({
    where: { id: { in: toDelete.map((o) => o.id) } },
  });
  console.log(`\n✓ Удалено заказов: ${result.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
