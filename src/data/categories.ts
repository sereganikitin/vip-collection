import { Category } from '@/types';

// ВАЖНО: slug категорий совпадает с id — на production все URL'ы используют
// английские slug'и (см. scripts/migrate-category-slugs.ts). SEO-словари
// в src/data/seo-content.ts и subcategory-content.ts тоже привязаны
// к этим английским ключам.
// Порядок и имена — синхронизированы с prisma/seed.ts и с DB (см.
// scripts/reorder-categories.ts). Категории belts + waist-bags слиты
// в «Разное» — здесь их больше нет.
export const categories: Category[] = [
  {
    id: 'suitcases',
    name: 'Чемоданы',
    slug: 'suitcases',
    image: '/images/categories/suitcases.jpg',
    productCount: 25,
  },
  {
    id: 'covers',
    name: 'Чехлы для чемоданов',
    slug: 'covers',
    image: '/images/categories/covers.jpg',
    productCount: 21,
  },
  {
    id: 'parts',
    name: 'Запчасти для чемоданов',
    slug: 'parts',
    image: '/images/categories/parts.jpg',
    productCount: 10,
  },
  {
    id: 'briefcases',
    name: 'Портфели и сумки',
    slug: 'briefcases',
    image: '/images/categories/briefcases.jpg',
    productCount: 4,
  },
  {
    id: 'backpacks',
    name: 'Рюкзаки и сумки',
    slug: 'backpacks',
    image: '/images/categories/backpacks.jpg',
    productCount: 32,
  },
  {
    id: 'women-bags',
    name: 'Женские сумки',
    slug: 'women-bags',
    image: '/images/categories/women-bags.jpg',
    productCount: 21,
  },
  {
    id: 'wallets',
    name: 'Портмоне и обложки',
    slug: 'wallets',
    image: '/images/categories/wallets.jpg',
    productCount: 27,
  },
  {
    id: 'misc',
    name: 'Разное',
    slug: 'misc',
    image: '/images/categories/misc.jpg',
    productCount: 27, // 12 (misc) + 5 (belts) + 10 (waist-bags)
  },
  {
    id: 'sale',
    name: 'РАСПРОДАЖА',
    slug: 'sale',
    image: '/images/categories/sale.jpg',
    productCount: 9,
  },
];
