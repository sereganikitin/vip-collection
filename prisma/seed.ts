import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await hash('admin2026', 12);
  await prisma.user.upsert({
    where: { email: 'admin@vip-collection.ru' },
    update: {},
    create: {
      email: 'admin@vip-collection.ru',
      password: adminPassword,
      name: 'Администратор',
      role: 'ADMIN',
    },
  });
  console.log('Admin user created: admin@vip-collection.ru / admin2026');

  // Create brands
  const brandsData = [
    { name: 'VIP COLLECTION', logo: '/images/brands/vip.png' },
    { name: 'ARISTOCRAT', logo: '/images/brands/aristocrat.png' },
    { name: 'David Jones', logo: '/images/brands/david-jones.jpg' },
    { name: 'NERI KARRA', logo: '/images/brands/neri-karra.jpg' },
    { name: 'OLIDIK', logo: '/images/brands/olidik.png' },
    { name: 'Conwood', logo: '/images/brands/conwood.png' },
    { name: 'Echolac', logo: '/images/brands/echolac.png' },
    { name: 'Leo Ventoni', logo: '/images/brands/leo-ventoni.jpg' },
    { name: 'Palio', logo: '/images/brands/palio.png' },
    { name: 'COSSNI', logo: '/images/brands/cossni.png' },
    { name: 'SUSEN', logo: '/images/brands/susen.jpg' },
  ];

  const brands: Record<string, string> = {};
  for (const b of brandsData) {
    const brand = await prisma.brand.upsert({
      where: { id: b.name.toLowerCase().replace(/\s+/g, '-') },
      update: { name: b.name, logo: b.logo },
      create: { id: b.name.toLowerCase().replace(/\s+/g, '-'), name: b.name, logo: b.logo },
    });
    brands[b.name] = brand.id;
  }
  console.log(`${Object.keys(brands).length} brands created`);

  // Create categories
  const categoriesData = [
    { id: 'suitcases', name: 'Чемоданы и кейс-пилоты', slug: 'chemodany', image: '/images/categories/suitcases.jpg', sortOrder: 1 },
    { id: 'women-bags', name: 'Сумки женские David Jones', slug: 'sumki-zhenskie', image: '/images/categories/women-bags.jpg', sortOrder: 2 },
    { id: 'briefcases', name: 'Портфели и сумки дорожные', slug: 'portfeli', image: '/images/categories/briefcases.jpg', sortOrder: 3 },
    { id: 'parts', name: 'Запчасти для чемоданов', slug: 'zapchasti', image: '/images/categories/parts.jpg', sortOrder: 4 },
    { id: 'wallets', name: 'Портмоне и обложки', slug: 'portmone', image: '/images/categories/wallets.jpg', sortOrder: 5 },
    { id: 'backpacks', name: 'Рюкзаки и сумки для ноутбука', slug: 'ryukzaki', image: '/images/categories/backpacks.jpg', sortOrder: 6 },
    { id: 'covers', name: 'Чехлы для чемоданов', slug: 'chekhly', image: '/images/categories/covers.jpg', sortOrder: 7 },
    { id: 'belts', name: 'Ремни', slug: 'remni', image: '/images/categories/belts.jpg', sortOrder: 8 },
    { id: 'waist-bags', name: 'Сумки на пояс', slug: 'sumki-na-poyas', image: '/images/categories/waist-bags.jpg', sortOrder: 9 },
    { id: 'misc', name: 'Разное', slug: 'raznoe', image: '/images/categories/misc.jpg', sortOrder: 10 },
    { id: 'sale', name: 'РАСПРОДАЖА', slug: 'rasprodazha', image: '/images/categories/sale.jpg', sortOrder: 11 },
  ];

  const categories: Record<string, string> = {};
  for (const c of categoriesData) {
    const cat = await prisma.category.upsert({
      where: { id: c.id },
      update: { name: c.name, slug: c.slug, image: c.image, sortOrder: c.sortOrder },
      create: c,
    });
    categories[c.id] = cat.id;
  }
  console.log(`${Object.keys(categories).length} categories created`);

  // Create products
  const productsData = [
    // Suitcases
    { name: 'Чемодан 14101 Sweet Pink S 20"', slug: 'chemodan-14101-sweet-pink-s', price: 4200, images: ['/images/products/thumb_14101-20-Sweet-Pink--_1_.jpg'], categoryId: 'suitcases', brand: 'VIP COLLECTION', description: 'Чемодан из поликарбоната Sweet Pink, размер S (20").', specs: { 'Размер': 'S 20"', 'Материал': 'Поликарбонат' }, isNew: true },
    { name: 'Чемодан 14101 Sweet Pink M 24"', slug: 'chemodan-14101-sweet-pink-m', price: 6300, images: ['/images/products/thumb_14101-24-Sweet-Pink-_1_.jpg'], categoryId: 'suitcases', brand: 'VIP COLLECTION', description: 'Чемодан из поликарбоната Sweet Pink, размер M (24").', specs: { 'Размер': 'M 24"', 'Материал': 'Поликарбонат' }, isNew: true },
    { name: 'Чемодан 14101 Sweet Pink L 28"', slug: 'chemodan-14101-sweet-pink-l', price: 6300, images: ['/images/products/thumb_14101-28-Sweet-Pink-_2_1.jpg'], categoryId: 'suitcases', brand: 'VIP COLLECTION', description: 'Чемодан из поликарбоната Sweet Pink, размер L (28").', specs: { 'Размер': 'L 28"', 'Материал': 'Поликарбонат' } },
    { name: 'Набор чемоданов 14101 Sweet Pink', slug: 'nabor-14101-sweet-pink', price: 13400, images: ['/images/products/thumb_14101-28-Sweet-Pink-_13_.jpg'], categoryId: 'suitcases', brand: 'VIP COLLECTION', description: 'Набор из 3-х чемоданов Sweet Pink.', specs: { 'Комплект': '3 чемодана' } },
    { name: 'Чемодан 14101 Watermelon Red S 20"', slug: 'chemodan-14101-watermelon-s', price: 4200, images: ['/images/products/thumb_14101-20_Watermelon-Red-_6_.jpg'], categoryId: 'suitcases', brand: 'VIP COLLECTION', description: 'Чемодан Watermelon Red, размер S.', specs: { 'Размер': 'S 20"' }, isNew: true },
    { name: 'Чемодан PC-808 TAUPE M 24"', slug: 'chemodan-pc808-taupe-m', price: 11000, images: ['/images/products/thumb_PC-808-24_TAUPE_1.jpg'], categoryId: 'suitcases', brand: 'VIP COLLECTION', description: 'Премиальный чемодан TAUPE Beige.', specs: { 'Размер': 'M 24"', 'Замок': 'TSA' } },
    { name: 'Набор чемоданов PC-808 TAUPE', slug: 'nabor-pc808-taupe', price: 26000, images: ['/images/products/thumb_PC-808_________________________________11.jpg'], categoryId: 'suitcases', brand: 'VIP COLLECTION', description: 'Набор из 3-х премиальных чемоданов TAUPE.', specs: { 'Комплект': '3 чемодана', 'Замок': 'TSA' } },
    { name: 'Чемодан PC-808 BURGUNDY S 20"', slug: 'chemodan-pc808-burgundy-s', price: 9000, images: ['/images/products/thumb_PC-808-20_BURGUNDY_12.jpg'], categoryId: 'suitcases', brand: 'VIP COLLECTION', description: 'Премиальный чемодан BURGUNDY.', specs: { 'Размер': 'S 20"', 'Замок': 'TSA' } },
    { name: 'Чемодан ARISTOCRAT 1421A Red S 20"', slug: 'chemodan-aristocrat-1421a-red-s', price: 3500, images: ['/images/products/thumb_1421A-20_RED_1.JPG'], categoryId: 'suitcases', brand: 'ARISTOCRAT', description: 'Чемодан ARISTOCRAT Red для ручной клади.', specs: { 'Размер': 'S 20"' } },
    { name: 'Чемодан ARISTOCRAT 1421A Red M 24"', slug: 'chemodan-aristocrat-1421a-red-m', price: 4000, images: ['/images/products/thumb_1421A-24_RED_1.JPG'], categoryId: 'suitcases', brand: 'ARISTOCRAT', description: 'Чемодан ARISTOCRAT Red, средний размер.', specs: { 'Размер': 'M 24"' } },
    { name: 'Кейс-пилот 14191 Black 17"', slug: 'keys-pilot-14191-black', price: 7500, images: ['/images/products/thumb_14191_1000__1000__11_.JPG'], categoryId: 'suitcases', brand: 'VIP COLLECTION', description: 'Кейс-пилот для деловых поездок.', specs: { 'Размер': '17"' } },
    { name: 'Чемодан 19-1 24" TURQUOISE', slug: 'chemodan-19-1-turquoise', price: 6900, images: ['/images/products/thumb_turquoise_24.jpg'], categoryId: 'suitcases', brand: 'VIP COLLECTION', description: 'Чемодан бирюзовый M (24").', specs: { 'Размер': 'M 24"' } },
    // Women bags
    { name: 'Сумка David Jones 3507 CM BLACK', slug: 'sumka-dj-3507-black', price: 1200, images: ['/images/products/thumb_3507_CM_BLACK_1.jpg'], categoryId: 'women-bags', brand: 'David Jones', description: 'Женская сумка David Jones, чёрная.', specs: { 'Материал': 'Экокожа' } },
    { name: 'Сумка David Jones 3507 CM COGNAC', slug: 'sumka-dj-3507-cognac', price: 1200, images: ['/images/products/thumb_3507_CM_COGNAC_11.jpg'], categoryId: 'women-bags', brand: 'David Jones', description: 'Женская сумка David Jones, коньячный.', specs: { 'Материал': 'Экокожа' } },
    { name: 'Рюкзак David Jones 3525 CM BLACK', slug: 'ryukzak-dj-3525-black', price: 1300, images: ['/images/products/thumb_3525_CM_BLACK_1.jpg'], categoryId: 'women-bags', brand: 'David Jones', description: 'Женский рюкзак David Jones.', specs: { 'Материал': 'Экокожа' }, isNew: true },
    { name: 'Сумка David Jones 5609-1 BLACK', slug: 'sumka-dj-5609-black', price: 800, images: ['/images/products/thumb_5609_1_BLACK_1.jpg'], categoryId: 'women-bags', brand: 'David Jones', description: 'Компактная сумка David Jones.', specs: { 'Материал': 'Экокожа' } },
    { name: 'Сумка David Jones 75607-3 BLACK', slug: 'sumka-dj-75607-black', price: 700, images: ['/images/products/thumb_75607_3_BLACK_11.jpg'], categoryId: 'women-bags', brand: 'David Jones', description: 'Сумка David Jones 75607-3.', specs: { 'Материал': 'Экокожа' } },
    { name: 'Сумка David Jones 75607-3 BORDEAUX', slug: 'sumka-dj-75607-bordeaux', price: 700, images: ['/images/products/thumb_75607_3_BORDEAUX_11.jpg'], categoryId: 'women-bags', brand: 'David Jones', description: 'Сумка David Jones, бордо.', specs: { 'Материал': 'Экокожа' } },
    { name: 'Рюкзак David Jones 6204-3 WATERMELON RED', slug: 'ryukzak-dj-6204-red', price: 1200, images: ['/images/products/thumb_6204-3-watermelon-red-sumka-ryukzak-david-jones1582225281_939116.jpg'], categoryId: 'women-bags', brand: 'David Jones', description: 'Женский рюкзак, арбузно-красный.', specs: { 'Материал': 'Экокожа' } },
    // Backpacks
    { name: 'Рюкзак ARISTOCRAT 1104 BLACK 17"', slug: 'ryukzak-aristocrat-1104', price: 2850, images: ['/images/products/thumb_1104_BLACK_11.jpg'], categoryId: 'backpacks', brand: 'ARISTOCRAT', description: 'Дорожный рюкзак для ноутбука 17".', specs: { 'Ноутбук': '17"' } },
    { name: 'Рюкзак ARISTOCRAT 1105 BLACK 14.3"', slug: 'ryukzak-aristocrat-1105', price: 2200, images: ['/images/products/thumb_1105_BLACK_1.jpg'], categoryId: 'backpacks', brand: 'ARISTOCRAT', description: 'Рюкзак для ноутбука 14.3".', specs: { 'Ноутбук': '14.3"' } },
    { name: 'Рюкзак ARISTOCRAT 1112 BLACK 16"', slug: 'ryukzak-aristocrat-1112', price: 2700, images: ['/images/products/thumb_1112__3_.jpg'], categoryId: 'backpacks', brand: 'ARISTOCRAT', description: 'Рюкзак для ноутбука 16".', specs: { 'Ноутбук': '16"' }, isNew: true },
    { name: 'Портфель-рюкзак ARISTOCRAT 2412 BLACK 17"', slug: 'portfel-ryukzak-aristocrat-2412', price: 3000, images: ['/images/products/thumb_2412-black-portfel-ryukzak-aristocrat-.jpg'], categoryId: 'backpacks', brand: 'ARISTOCRAT', description: 'Портфель-рюкзак трансформер.', specs: { 'Ноутбук': '17"' } },
    { name: 'Рюкзак OLIDIK 2758 PINK', slug: 'ryukzak-olidik-2758-pink', price: 790, images: ['/images/products/thumb_2758_pink.jpg'], categoryId: 'backpacks', brand: 'OLIDIK', description: 'Женский рюкзак розовый.', specs: {} },
    { name: 'Рюкзак VIP COLLECTION 003-LH BLACK', slug: 'ryukzak-vip-003-lh-black', price: 15000, images: ['/images/products/thumb_003-LH-BLACK_v1.jpg'], categoryId: 'backpacks', brand: 'VIP COLLECTION', description: 'Рюкзак из натуральной кожи.', specs: { 'Материал': 'Натуральная кожа' } },
    // Briefcases
    { name: 'Портфель VIP COLLECTION 005-LH BLACK', slug: 'portfel-vip-005-lh-black', price: 12000, images: ['/images/products/thumb_005-LH-BLACK-v.jpg'], categoryId: 'briefcases', brand: 'VIP COLLECTION', description: 'Деловой портфель из натуральной кожи.', specs: { 'Материал': 'Натуральная кожа' } },
    { name: 'Сумка VIP COLLECTION 113157 BLACK', slug: 'sumka-vip-113157-black', price: 8500, images: ['/images/products/thumb_113157A_BLACK_1_1000.jpg'], categoryId: 'briefcases', brand: 'VIP COLLECTION', description: 'Кожаная сумка.', specs: { 'Материал': 'Натуральная кожа' } },
    { name: 'Сумка VIP COLLECTION 113858 BLACK', slug: 'sumka-vip-113858-black', price: 12500, images: ['/images/products/thumb_113858-BLACK__281_29.jpg'], categoryId: 'briefcases', brand: 'VIP COLLECTION', description: 'Кожаная дорожная сумка.', specs: { 'Материал': 'Натуральная кожа' } },
    // Wallets
    { name: 'Портмоне NERI KARRA 0031.05.01', slug: 'portmone-nk-0031-05-01', price: 1900, images: ['/images/products/thumb_0031.05.01_01.jpg'], categoryId: 'wallets', brand: 'NERI KARRA', description: 'Мужское портмоне из натуральной кожи.', specs: { 'Материал': 'Натуральная кожа' } },
    { name: 'Портмоне NERI KARRA 0031.05.05', slug: 'portmone-nk-0031-05-05', price: 1900, images: ['/images/products/thumb_0031.05.05_01.jpg'], categoryId: 'wallets', brand: 'NERI KARRA', description: 'Мужское портмоне из натуральной кожи.', specs: { 'Материал': 'Натуральная кожа' } },
    { name: 'Портмоне NERI KARRA 0049.05.01', slug: 'portmone-nk-0049-05-01', price: 1900, images: ['/images/products/thumb_0049.05.01_01.jpg'], categoryId: 'wallets', brand: 'NERI KARRA', description: 'Портмоне из натуральной кожи.', specs: { 'Материал': 'Натуральная кожа' }, isNew: true },
    { name: 'Обложка для паспорта NERI KARRA 0040.8', slug: 'oblozhka-nk-0040-8', price: 590, images: ['/images/products/thumb_0040.8-57.01_01.jpg'], categoryId: 'wallets', brand: 'NERI KARRA', description: 'Обложка для паспорта.', specs: { 'Материал': 'Натуральная кожа' } },
    // Covers
    { name: 'Чехол 0001 L 28"', slug: 'chekhol-0001-l', price: 990, images: ['/images/products/thumb_0001_L.jpg'], categoryId: 'covers', brand: 'VIP COLLECTION', description: 'Эластичный чехол для чемодана L (28").', specs: { 'Размер': 'L 28"' } },
    { name: 'Чехол 0001 M 24"', slug: 'chekhol-0001-m', price: 1250, images: ['/images/products/thumb_0001_M.jpg'], categoryId: 'covers', brand: 'VIP COLLECTION', description: 'Эластичный чехол для чемодана M (24").', specs: { 'Размер': 'M 24"' } },
    { name: 'Чехол 0001 S 20"', slug: 'chekhol-0001-s', price: 850, images: ['/images/products/thumb_0001_S.jpg'], categoryId: 'covers', brand: 'VIP COLLECTION', description: 'Эластичный чехол для чемодана S (20").', specs: { 'Размер': 'S 20"' } },
    { name: 'Ремень для чемодана ORANGE', slug: 'remen-chemodan-orange', price: 250, images: ['/images/products/thumb_remen1-web-orange.jpg'], categoryId: 'covers', brand: 'VIP COLLECTION', description: 'Ремень для фиксации чемодана.', specs: {} },
    // Belts
    { name: 'Ремень кожаный 24026512 Black', slug: 'remen-24026512-black', price: 2300, images: ['/images/products/thumb_24026512__1_.jpg'], categoryId: 'belts', brand: 'VIP COLLECTION', description: 'Классический мужской ремень.', specs: { 'Материал': 'Натуральная кожа' } },
    { name: 'Ремень кожаный 24026513 Black', slug: 'remen-24026513-black', price: 1980, images: ['/images/products/thumb_24026513__2_.jpg'], categoryId: 'belts', brand: 'VIP COLLECTION', description: 'Мужской ремень из натуральной кожи.', specs: { 'Материал': 'Натуральная кожа' } },
    // Waist bags
    { name: 'Сумка на пояс 121316 GREEN', slug: 'sumka-poyas-121316-green', price: 250, images: ['/images/products/thumb_121316_Green_3.jpg'], categoryId: 'waist-bags', brand: 'VIP COLLECTION', description: 'Поясная сумка, зелёная.', specs: {} },
    { name: 'Сумка на пояс 121409 BLACK', slug: 'sumka-poyas-121409-black', price: 300, images: ['/images/products/thumb_121409_Black_3.jpg'], categoryId: 'waist-bags', brand: 'VIP COLLECTION', description: 'Поясная сумка, чёрная.', specs: {} },
    // Sale
    { name: 'Сумка OLIDIK 05934 Blue', slug: 'sumka-olidik-05934-blue', price: 250, images: ['/images/products/thumb_oli05934blue.jpg'], categoryId: 'sale', brand: 'OLIDIK', description: 'Сумка по специальной цене.', specs: {}, isSale: true },
    { name: 'Сумка OLIDIK 05929 Black', slug: 'sumka-olidik-05929-black', price: 50, images: ['/images/products/thumb_oli05929black.jpg'], categoryId: 'sale', brand: 'OLIDIK', description: 'Ликвидация остатков.', specs: {}, isSale: true },
    // Misc
    { name: 'Чехол для бутылки вина BLACK', slug: 'chekhol-butylki-black', price: 1200, images: ['/images/products/thumb_DS_40227_BLACK_1.jpg'], categoryId: 'misc', brand: 'VIP COLLECTION', description: 'Кожаный чехол для бутылки вина.', specs: { 'Материал': 'Натуральная кожа' } },
    { name: 'Чехол для бутылки вина CAMEL', slug: 'chekhol-butylki-camel', price: 1200, images: ['/images/products/thumb_DS_40227_CAMEL_1.jpg'], categoryId: 'misc', brand: 'VIP COLLECTION', description: 'Кожаный чехол для бутылки вина.', specs: { 'Материал': 'Натуральная кожа' } },
    // Parts
    { name: 'Колесо 19-1-24,28', slug: 'koleso-19-1-24-28', price: 400, images: ['/images/products/thumb_IMG_20250328_023313.jpg'], categoryId: 'parts', brand: 'VIP COLLECTION', description: 'Запасное колесо для чемоданов 24"/28".', specs: {} },
  ];

  let productCount = 0;
  for (const p of productsData) {
    const brandId = brands[p.brand];
    if (!brandId) { console.log(`Brand not found: ${p.brand}`); continue; }

    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name, price: p.price, images: p.images,
        description: p.description, specs: p.specs,
        isNew: p.isNew || false, isSale: p.isSale || false,
        categoryId: categories[p.categoryId], brandId,
      },
      create: {
        name: p.name, slug: p.slug, price: p.price, images: p.images,
        description: p.description, specs: p.specs,
        isNew: p.isNew || false, isSale: p.isSale || false,
        categoryId: categories[p.categoryId], brandId,
      },
    });
    productCount++;
  }

  console.log(`${productCount} products created`);

  // Create default banners
  const bannersData = [
    { image: '/images/banners/banner-1.jpg', sortOrder: 1 },
    { image: '/images/banners/banner-2.jpg', sortOrder: 2 },
    { image: '/images/banners/banner-3.jpg', sortOrder: 3 },
    { image: '/images/banners/banner-5.jpg', sortOrder: 4 },
  ];
  for (const b of bannersData) {
    await prisma.banner.upsert({
      where: { id: `banner-${b.sortOrder}` },
      update: b,
      create: { id: `banner-${b.sortOrder}`, ...b },
    });
  }
  console.log(`${bannersData.length} banners created`);

  // Create default settings
  await prisma.setting.upsert({
    where: { key: 'admin_email' },
    update: {},
    create: { key: 'admin_email', value: 'k959em177@gmail.com' },
  });
  console.log('Default settings created');

  console.log('Seeding complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
