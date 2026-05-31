import { Category } from '@/types';

// ВАЖНО: slug категорий совпадает с id — на production все URL'ы используют
// английские slug'и (см. scripts/migrate-category-slugs.ts). SEO-словари
// в src/data/seo-content.ts и subcategory-content.ts тоже привязаны
// к этим английским ключам.
export const categories: Category[] = [
  {
    id: 'suitcases',
    name: 'Чемоданы и кейс-пилоты',
    slug: 'suitcases',
    image: '/images/categories/suitcases.jpg',
    productCount: 25,
  },
  {
    id: 'women-bags',
    name: 'Сумки женские David Jones',
    slug: 'women-bags',
    image: '/images/categories/women-bags.jpg',
    productCount: 21,
  },
  {
    id: 'briefcases',
    name: 'Портфели и сумки дорожные',
    slug: 'briefcases',
    image: '/images/categories/briefcases.jpg',
    productCount: 4,
  },
  {
    id: 'parts',
    name: 'Запчасти для чемоданов',
    slug: 'parts',
    image: '/images/categories/parts.jpg',
    productCount: 10,
  },
  {
    id: 'wallets',
    name: 'Портмоне и обложки',
    slug: 'wallets',
    image: '/images/categories/wallets.jpg',
    productCount: 27,
  },
  {
    id: 'backpacks',
    name: 'Рюкзаки и сумки для ноутбука',
    slug: 'backpacks',
    image: '/images/categories/backpacks.jpg',
    productCount: 32,
  },
  {
    id: 'covers',
    name: 'Чехлы для чемоданов',
    slug: 'covers',
    image: '/images/categories/covers.jpg',
    productCount: 21,
  },
  {
    id: 'belts',
    name: 'Ремни',
    slug: 'belts',
    image: '/images/categories/belts.jpg',
    productCount: 5,
  },
  {
    id: 'waist-bags',
    name: 'Сумки на пояс',
    slug: 'waist-bags',
    image: '/images/categories/waist-bags.jpg',
    productCount: 10,
  },
  {
    id: 'misc',
    name: 'Разное',
    slug: 'misc',
    image: '/images/categories/misc.jpg',
    productCount: 12,
  },
  {
    id: 'sale',
    name: 'РАСПРОДАЖА',
    slug: 'sale',
    image: '/images/categories/sale.jpg',
    productCount: 9,
  },
];
