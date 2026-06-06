/* eslint-disable no-console */
/**
 * Очистка устаревших значений в Setting:
 *   - contact_address_full / contact_address_short / contact_postal_code
 *     — раньше содержали «Сормовский проезд, 11, стр. 1»
 *   - contact_telegram_url / contact_telegram_username / contact_whatsapp_url
 *     — мессенджер-контакты, которые мы убираем со страницы контактов
 *   - legal_address — может содержать тот же адрес склада
 *
 * Запуск:
 *   npx tsx scripts/reset-contact-fields.ts          # просмотр текущих значений
 *   npx tsx scripts/reset-contact-fields.ts --yes    # реальная очистка
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const KEYS_TO_RESET: { key: string; resetTo: string; reason: string }[] = [
  { key: 'contact_address_full',     resetTo: 'г. Москва',     reason: 'был склад на Сормовском' },
  { key: 'contact_address_short',    resetTo: 'Москва',        reason: 'был склад на Сормовском' },
  { key: 'contact_postal_code',      resetTo: '',              reason: 'был индекс склада' },
  { key: 'contact_telegram_url',     resetTo: '',              reason: 'мессенджер убран с сайта' },
  { key: 'contact_telegram_username', resetTo: '',             reason: 'мессенджер убран с сайта' },
  { key: 'contact_whatsapp_url',     resetTo: '',              reason: 'мессенджер убран с сайта' },
  { key: 'legal_address',            resetTo: '',              reason: 'был адрес склада, заполните юр.адрес ИП вручную' },
];

async function main() {
  const dryRun = !process.argv.includes('--yes');

  const rows = await prisma.setting.findMany({
    where: { key: { in: KEYS_TO_RESET.map((k) => k.key) } },
  });
  const byKey = new Map(rows.map((r) => [r.key, r.value]));

  console.log('━━━ Текущие значения ━━━');
  for (const k of KEYS_TO_RESET) {
    const current = byKey.get(k.key);
    const status = current === undefined ? '(нет в БД)' : current === '' ? '(пустое)' : `«${current}»`;
    console.log(`  ${k.key.padEnd(28)} = ${status}`);
    console.log(`    → станет: «${k.resetTo}» (${k.reason})`);
  }

  if (dryRun) {
    console.log('\n[DRY RUN] Ничего не изменено. Для применения:');
    console.log('  npx tsx scripts/reset-contact-fields.ts --yes');
    return;
  }

  console.log('\n━━━ Применяем ━━━');
  for (const k of KEYS_TO_RESET) {
    await prisma.setting.upsert({
      where: { key: k.key },
      create: { key: k.key, value: k.resetTo },
      update: { value: k.resetTo },
    });
    console.log(`  ✓ ${k.key} = «${k.resetTo}»`);
  }
  console.log('\nГотово. На сайте обновится сразу (force-dynamic страницы), кэш чистить не нужно.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
