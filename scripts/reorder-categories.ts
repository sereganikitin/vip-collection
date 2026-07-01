/* eslint-disable no-console */
/**
 * Реорганизация категорий каталога:
 *  - Товары из belts + waist-bags переезжают в misc.
 *  - Категории belts и waist-bags деактивируются (isActive=false) —
 *    не удаляем, чтобы историю заказов не сломать, но из меню они
 *    исчезнут (Header читает only isActive=true).
 *  - Оставшиеся категории переименовываются и получают новый sortOrder
 *    по ТЗ:
 *      1. suitcases   — «Чемоданы»
 *      2. covers      — «Чехлы для чемоданов»
 *      3. parts       — «Запчасти для чемоданов»
 *      4. briefcases  — «Портфели и сумки»
 *      5. backpacks   — «Рюкзаки и сумки»
 *      6. women-bags  — «Женские сумки»
 *      7. wallets     — «Портмоне и обложки»
 *      8. misc        — «Разное» (принимает belts + waist-bags)
 *      9. sale        — «РАСПРОДАЖА»
 *
 * Использование:
 *   npx tsx scripts/reorder-categories.ts          # dry-run
 *   npx tsx scripts/reorder-categories.ts --yes    # применить
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CategorySpec {
  id: string;
  name: string;
  sortOrder: number;
}

const NEW_ORDER: CategorySpec[] = [
  { id: 'suitcases',  name: 'Чемоданы',              sortOrder: 1 },
  { id: 'covers',     name: 'Чехлы для чемоданов',   sortOrder: 2 },
  { id: 'parts',      name: 'Запчасти для чемоданов', sortOrder: 3 },
  { id: 'briefcases', name: 'Портфели и сумки',      sortOrder: 4 },
  { id: 'backpacks',  name: 'Рюкзаки и сумки',       sortOrder: 5 },
  { id: 'women-bags', name: 'Женские сумки',         sortOrder: 6 },
  { id: 'wallets',    name: 'Портмоне и обложки',    sortOrder: 7 },
  { id: 'misc',       name: 'Разное',                sortOrder: 8 },
  { id: 'sale',       name: 'РАСПРОДАЖА',            sortOrder: 9 },
];

const CATEGORIES_TO_MERGE_INTO_MISC = ['belts', 'waist-bags'];
const TARGET_CATEGORY = 'misc';

async function main() {
  const dryRun = !process.argv.includes('--yes');

  console.log('━━━ Реорганизация категорий каталога ━━━\n');
  console.log(dryRun ? '[DRY RUN] Изменения только показываются, ничего не применяется.\n' : '[APPLY] Применяю изменения.\n');

  // 1. Товары из belts + waist-bags → misc
  const productsToMove = await prisma.product.findMany({
    where: { categoryId: { in: CATEGORIES_TO_MERGE_INTO_MISC } },
    select: { id: true, name: true, categoryId: true },
    orderBy: { categoryId: 'asc' },
  });

  console.log(`▸ Товаров для переноса в «${TARGET_CATEGORY}»: ${productsToMove.length}`);
  for (const p of productsToMove) {
    console.log(`    [${p.categoryId}] ${p.name}`);
  }
  console.log('');

  // 2. Категории belts + waist-bags → isActive=false
  const catsToDeactivate = await prisma.category.findMany({
    where: { id: { in: CATEGORIES_TO_MERGE_INTO_MISC } },
    select: { id: true, name: true, isActive: true },
  });
  console.log('▸ Категории, которые будут деактивированы (скрыты из меню):');
  for (const c of catsToDeactivate) {
    console.log(`    ${c.id} — «${c.name}» (сейчас isActive=${c.isActive})`);
  }
  console.log('');

  // 3. Переименование + порядок
  const existing = await prisma.category.findMany({
    where: { id: { in: NEW_ORDER.map((c) => c.id) } },
    select: { id: true, name: true, sortOrder: true },
  });
  const byId = new Map(existing.map((c) => [c.id, c]));
  console.log('▸ Новый порядок и имена (было → станет):');
  for (const spec of NEW_ORDER) {
    const cur = byId.get(spec.id);
    if (!cur) {
      console.log(`    [!] ${spec.id} — не найдено в БД, пропускаю`);
      continue;
    }
    const changedName = cur.name !== spec.name;
    const changedOrder = cur.sortOrder !== spec.sortOrder;
    const marker = changedName || changedOrder ? '✎' : ' ';
    console.log(
      `    ${marker} [${spec.sortOrder}] ${spec.id}: ` +
        `«${cur.name}» → «${spec.name}»` +
        (changedOrder ? `, sortOrder ${cur.sortOrder} → ${spec.sortOrder}` : '')
    );
  }
  console.log('');

  if (dryRun) {
    console.log('[DRY RUN] Готово. Для реального применения запустите с --yes');
    return;
  }

  // ─── Применяем ───
  if (productsToMove.length > 0) {
    const res = await prisma.product.updateMany({
      where: { categoryId: { in: CATEGORIES_TO_MERGE_INTO_MISC } },
      data: { categoryId: TARGET_CATEGORY },
    });
    console.log(`✓ Переназначено товаров: ${res.count}`);
  }

  if (catsToDeactivate.length > 0) {
    const res = await prisma.category.updateMany({
      where: { id: { in: CATEGORIES_TO_MERGE_INTO_MISC } },
      data: { isActive: false, sortOrder: 999 },
    });
    console.log(`✓ Деактивировано категорий: ${res.count}`);
  }

  for (const spec of NEW_ORDER) {
    await prisma.category.update({
      where: { id: spec.id },
      data: { name: spec.name, sortOrder: spec.sortOrder, isActive: true },
    }).catch((e) => {
      console.warn(`  ⚠ Не удалось обновить «${spec.id}»:`, e.message);
    });
  }
  console.log(`✓ Обновлено категорий: ${NEW_ORDER.length}`);
  console.log('\nГотово.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
