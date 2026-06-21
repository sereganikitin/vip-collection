/* eslint-disable no-console */
/**
 * Очистка БД от тестовых заказов.
 *
 * По умолчанию работает в режиме dry-run: показывает что было бы удалено,
 * но ничего не трогает. Для реального удаления добавить --yes.
 *
 * Способы выбрать какие заказы СОХРАНИТЬ:
 *
 *   1. Передать номера явно:
 *      npx tsx scripts/delete-test-orders.ts --keep 17,18
 *      npx tsx scripts/delete-test-orders.ts --keep 17,18 --yes
 *
 *   2. Сохранить только реально успешные (paid + delivered):
 *      npx tsx scripts/delete-test-orders.ts --paid-delivered
 *      npx tsx scripts/delete-test-orders.ts --paid-delivered --yes
 *
 *   3. Просто посмотреть весь список без удаления:
 *      npx tsx scripts/delete-test-orders.ts --list
 *
 * OrderItem удаляются автоматически каскадом (см. prisma/schema.prisma).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseKeepNumbers(): number[] {
  const idx = process.argv.indexOf('--keep');
  if (idx < 0 || idx + 1 >= process.argv.length) return [];
  return process.argv[idx + 1]
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

async function main() {
  const dryRun = !process.argv.includes('--yes');
  const listOnly = process.argv.includes('--list');
  const keepPaidDelivered = process.argv.includes('--paid-delivered');
  const keepNumbers = parseKeepNumbers();

  const all = await prisma.order.findMany({
    select: {
      id: true,
      number: true,
      customerName: true,
      customerPhone: true,
      totalPrice: true,
      paymentMethod: true,
      paymentStatus: true,
      status: true,
      createdAt: true,
    },
    orderBy: { number: 'asc' },
  });

  if (all.length === 0) {
    console.log('БД пустая, нечего чистить.');
    return;
  }

  if (listOnly) {
    console.log('━━━ Все заказы в БД ━━━');
    for (const o of all) {
      console.log(
        `  #${String(o.number).padStart(3)}  ${o.customerName.padEnd(30)}  ${String(o.totalPrice).padStart(8)}₽  ` +
          `[${o.status}/${o.paymentStatus}/${o.paymentMethod}]  ${o.createdAt.toISOString().slice(0, 16)}`
      );
    }
    console.log(`\nИтого: ${all.length} заказ(ов)`);
    return;
  }

  // Определяем, что сохраняем
  let keepFn: (o: (typeof all)[number]) => boolean;
  if (keepNumbers.length > 0) {
    keepFn = (o) => keepNumbers.includes(o.number);
    console.log(`Режим: сохранить только номера ${keepNumbers.join(', ')}.`);
  } else if (keepPaidDelivered) {
    keepFn = (o) => o.paymentStatus === 'paid' && o.status === 'DELIVERED';
    console.log('Режим: сохранить только оплаченные и доставленные.');
  } else {
    console.error(
      'Не указан режим. Передайте один из:\n' +
        '  --keep 17,18           (явный список номеров)\n' +
        '  --paid-delivered       (только paid + DELIVERED)\n' +
        '  --list                 (просто показать все)\n'
    );
    process.exitCode = 1;
    return;
  }

  const toKeep = all.filter(keepFn);
  const toDelete = all.filter((o) => !keepFn(o));

  console.log('\n━━━ Будут СОХРАНЕНЫ ━━━');
  if (toKeep.length === 0) console.log('  (нет заказов под этот фильтр)');
  for (const o of toKeep) {
    console.log(
      `  #${o.number}  ${o.customerName}  ${o.totalPrice}₽  ` +
        `[${o.status}/${o.paymentStatus}]  ${o.createdAt.toISOString().slice(0, 16)}`
    );
  }

  console.log('\n━━━ Будут УДАЛЕНЫ ━━━');
  if (toDelete.length === 0) console.log('  (нечего удалять)');
  for (const o of toDelete) {
    console.log(
      `  #${o.number}  ${o.customerName}  ${o.totalPrice}₽  ` +
        `[${o.status}/${o.paymentStatus}]  ${o.createdAt.toISOString().slice(0, 16)}`
    );
  }

  console.log(`\nИтого: оставить ${toKeep.length}, удалить ${toDelete.length}`);

  if (toKeep.length === 0 && toDelete.length > 0) {
    console.error(
      '\n⚠ Под указанный фильтр не попал ни один заказ — это удалит всё. ' +
        'Прерываю на всякий случай. Проверьте флаг.'
    );
    process.exitCode = 1;
    return;
  }

  if (dryRun) {
    console.log('\n[DRY RUN] Ничего не удалено. Для реального удаления добавьте --yes.');
    return;
  }

  if (toDelete.length === 0) {
    console.log('\nНечего удалять.');
    return;
  }

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
