/* eslint-disable no-console */
/**
 * Диагностика интеграции с Я.Доставкой.
 * Запуск:
 *   npx tsx scripts/test-yandex-delivery.ts
 * либо с другим адресом:
 *   npx tsx scripts/test-yandex-delivery.ts "Москва, Тверская 1"
 *
 * Что делает:
 *   1. Читает из БД настройки yd_token / yd_geocoder_key / yd_pickup_*
 *   2. Шлёт пробный запрос в Яндекс Геокодер с тестовым адресом
 *   3. Если геокодирование прошло — шлёт пробный check-price в Я.Доставку
 *   4. Печатает результат каждого шага по-человечески
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_ADDRESS = process.argv[2] || 'Москва, Тверская 1';

async function main() {
  // 1) Конфиг из БД
  const rows = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          'yd_token',
          'yd_geocoder_key',
          'yd_pickup_address',
          'yd_pickup_lat',
          'yd_pickup_lng',
        ],
      },
    },
  });
  const cfg = new Map(rows.map((r) => [r.key, r.value]));

  console.log('═══ Конфиг в БД ═══');
  for (const k of ['yd_geocoder_key', 'yd_token', 'yd_pickup_address', 'yd_pickup_lat', 'yd_pickup_lng']) {
    const v = cfg.get(k);
    if (!v) {
      console.log(`  ${k}: ✗ ПУСТО`);
    } else if (k === 'yd_geocoder_key' || k === 'yd_token') {
      console.log(`  ${k}: ✓ есть (${v.length} символов, начало: «${v.slice(0, 8)}…»)`);
    } else {
      console.log(`  ${k}: ${v}`);
    }
  }

  const geoKey = cfg.get('yd_geocoder_key');
  const token = cfg.get('yd_token');

  if (!geoKey) {
    console.log('\n✗ Ключ Геокодера не сохранён в админке. Откройте /admin/settings → Яндекс Доставка → введите ключ → Сохранить.');
    return;
  }

  // 2) Геокодер
  console.log(`\n═══ Тест Геокодера: «${TEST_ADDRESS}» ═══`);
  const url = new URL('https://geocode-maps.yandex.ru/1.x/');
  url.searchParams.set('apikey', geoKey);
  url.searchParams.set('geocode', TEST_ADDRESS);
  url.searchParams.set('format', 'json');
  url.searchParams.set('lang', 'ru_RU');
  url.searchParams.set('results', '1');

  const geoRes = await fetch(url.toString());
  console.log(`HTTP: ${geoRes.status} ${geoRes.statusText}`);
  const bodyText = await geoRes.text();
  console.log(`Ответ (первые 600 символов):\n${bodyText.slice(0, 600)}`);

  if (geoRes.status === 403) {
    console.log(`
✗ 403 Forbidden — частые причины:
  • Ключ только что зарегистрирован, ещё не активировался (подождите 30 минут)
  • Ключ зарегистрирован для «JavaScript API + Геокодер», а нужен отдельный «Геокодер API» (HTTP)
  • В настройках ключа стоят ограничения по HTTP-Referer или IP — для серверных запросов оба должны быть пусты
  • Проверьте https://developer.tech.yandex.ru/services → ваш ключ → Настройки
`);
    return;
  }

  let lat: number | undefined;
  let lng: number | undefined;
  try {
    const data = JSON.parse(bodyText);
    const feature = data.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
    const pos = feature?.Point?.pos;
    const text = feature?.metaDataProperty?.GeocoderMetaData?.text;
    if (pos) {
      const [ln, la] = pos.split(' ').map(parseFloat);
      lng = ln; lat = la;
      console.log(`\n✓ Геокодер распознал: «${text}»`);
      console.log(`  Координаты: lat=${la}, lng=${ln}`);
    } else {
      console.log('\n✗ Адрес не распознан (но ключ работает) — попробуйте другой адрес');
    }
  } catch (e) {
    console.log(`\n✗ Не удалось разобрать ответ как JSON: ${e}`);
  }

  // 3) Я.Доставка check-price (только если есть координаты и токен)
  if (!token) {
    console.log('\n⚠ yd_token пустой — пропускаем тест Я.Доставки. Сохраните токен в админке.');
    return;
  }
  if (lat == null || lng == null) {
    return;
  }

  console.log(`\n═══ Тест Я.Доставка check-price ═══`);
  const pickupLat = parseFloat(cfg.get('yd_pickup_lat') ?? '55.708');
  const pickupLng = parseFloat(cfg.get('yd_pickup_lng') ?? '37.6906');
  const pickupAddress = cfg.get('yd_pickup_address') ?? 'Москва, Сормовский 11';

  const body = {
    items: [
      {
        title: 'Тестовый чемодан',
        quantity: 1,
        size: { length: 0.65, width: 0.45, height: 0.27 },
        weight: 3.5,
        cost_currency: 'RUB',
        cost_value: '5000',
      },
    ],
    route_points: [
      { coordinates: [pickupLng, pickupLat], fullname: pickupAddress },
      { coordinates: [lng, lat], fullname: TEST_ADDRESS },
    ],
  };

  const cargoRes = await fetch('https://b2b.taxi.yandex.net/b2b/cargo/integration/v2/check-price', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': 'ru',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  console.log(`HTTP: ${cargoRes.status} ${cargoRes.statusText}`);
  const cargoText = await cargoRes.text();
  console.log(`Ответ (первые 800 символов):\n${cargoText.slice(0, 800)}`);
}

main()
  .catch((e) => {
    console.error('Скрипт упал:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
