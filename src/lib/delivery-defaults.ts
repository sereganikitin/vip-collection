// Дефолтные габариты и вес товара для расчёта стоимости доставки.
// Используются, когда в карточке товара поля length/width/height/weight пустые.
// Значения подобраны как средние по категории — для точного расчёта
// заполните поля в админке (/admin/products/[id]).
//
// Единицы:
//   - размеры в сантиметрах (cm)
//   - вес в килограммах (kg)
//
// Я.Доставка передаёт размеры в метрах и вес в килограммах — конвертация
// в lib/yandex-delivery.ts.

export interface ItemDims {
  length: number; // cm
  width: number;
  height: number;
  weight: number; // kg
}

// Дефолты по category.id. Если категории нет в этом списке — используется fallback.
export const CATEGORY_DEFAULTS: Record<string, ItemDims> = {
  // Чемоданы: усреднение для M (24") как самого популярного размера.
  // Реально S (20") меньше, L (28") больше — задавайте точные значения per-product.
  suitcases: { length: 65, width: 45, height: 27, weight: 3.5 },

  // Женские сумки David Jones — средний тоут
  'women-bags': { length: 32, width: 25, height: 12, weight: 0.7 },

  // Кожаные портфели / дорожные сумки
  briefcases: { length: 40, width: 30, height: 15, weight: 1.5 },

  // Рюкзаки для ноутбука
  backpacks: { length: 45, width: 30, height: 18, weight: 1.0 },

  // Портмоне, обложки — кожгалантерея, маленькое и лёгкое
  wallets: { length: 12, width: 10, height: 2, weight: 0.15 },

  // Чехлы для чемоданов — компактные, лёгкие
  covers: { length: 25, width: 20, height: 5, weight: 0.25 },

  // Ремни
  belts: { length: 30, width: 5, height: 3, weight: 0.3 },

  // Поясные сумки
  'waist-bags': { length: 25, width: 15, height: 8, weight: 0.3 },

  // Запчасти — колёса, ручки и т.п.
  parts: { length: 15, width: 10, height: 5, weight: 0.3 },

  // Распродажа — фактически разное, ориентируемся на «среднюю сумку»
  sale: { length: 35, width: 25, height: 15, weight: 1.5 },
};

// Универсальный fallback, если category.id не нашёлся в CATEGORY_DEFAULTS.
export const GENERIC_FALLBACK: ItemDims = {
  length: 30,
  width: 20,
  height: 15,
  weight: 1.0,
};

/**
 * Получить размеры конкретного товара: явные поля product перевешивают дефолт,
 * пустые поля заполняются из дефолта категории.
 */
export function resolveItemDims(
  categoryId: string,
  explicit?: Partial<ItemDims>
): ItemDims {
  const cat = CATEGORY_DEFAULTS[categoryId] ?? GENERIC_FALLBACK;
  return {
    length: explicit?.length ?? cat.length,
    width:  explicit?.width ?? cat.width,
    height: explicit?.height ?? cat.height,
    weight: explicit?.weight ?? cat.weight,
  };
}
