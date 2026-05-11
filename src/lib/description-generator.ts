// Build unique, factually-correct product descriptions from DB fields.
// Goal: each product gets a description that
//   1. is reproducible (same input → same output),
//   2. is distinct from the legacy site's own description (different
//      sentence structure, store wording, opener),
//   3. is correct (uses actual product name, brand, price, specs).
//
// Approach: per-category fragments are picked by a hash of the product id.
// Available permutations per product: openers × middles × closers × store.

interface ProductForGen {
  id: string;
  name: string;
  brand: string;
  categoryId: string;
  price: number;
  oldPrice?: number | null;
  specs?: Record<string, string> | null;
}

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0;
  return h >>> 0;
}

function pick<T>(arr: T[], seed: string, salt: string): T {
  return arr[djb2(seed + ':' + salt) % arr.length];
}

function priceFmt(p: number): string {
  return new Intl.NumberFormat('ru-RU').format(p);
}

// Strip the brand and the leading "Чемодан/Сумка/etc." word so we can use the
// rest of the name as a model designator.
function modelToken(p: ProductForGen): string {
  const lead = /^(?:Чемодан|Сумка|Сумки|Рюкзак|Портфель|Чехол|Ремень|Портмоне|Кошелёк|Колесо|Колеса|Колёса|Ручка|Запчасть|Обложка)\b\s*/i;
  let t = p.name.replace(lead, '');
  if (p.brand) t = t.replace(new RegExp(p.brand.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'), '');
  t = t.replace(/\s+/g, ' ').trim();
  return t || p.name;
}

function extractSize(name: string): string | null {
  const m = name.match(/\b([SML])[-\s]?\d{2}"?/i);
  return m ? m[0].toUpperCase().replace(/\s+/g, '-') : null;
}

function extractColor(name: string): string | null {
  const colors = [
    'Sweet Pink', 'Watermelon Red', 'Burgundy', 'Taupe', 'Turquoise', 'Pearl Blue',
    'Shampagne', 'Champagne', 'Black', 'White', 'Red', 'Blue', 'Green', 'Pink',
    'Yellow', 'Gold', 'Silver', 'Orange', 'Purple', 'Grey', 'Gray', 'Fuchsia',
    'D.Grey', 'Bordeaux',
  ];
  for (const c of colors) {
    const re = new RegExp(`\\b${c.replace('.', '\\.')}\\b`, 'i');
    if (re.test(name)) return c;
  }
  return null;
}

const OPENERS: Record<string, string[]> = {
  suitcases: [
    'Жёсткий чемодан из 100% поликарбоната под брендом',
    'Лёгкий поликарбонатный чемодан марки',
    'Дорожный чемодан-карри от',
    'Чемодан на колёсах серии',
  ],
  'women-bags': [
    'Женская сумка из коллекции',
    'Удобная повседневная сумка от',
    'Стильная сумка бренда',
  ],
  briefcases: [
    'Кожаный портфель производства',
    'Деловой портфель из натуральной кожи марки',
    'Классический портфель серии',
  ],
  parts: [
    'Сменная запчасть для чемоданов',
    'Деталь для самостоятельного ремонта чемоданов',
    'Расходник для ремонта чемоданов',
  ],
  wallets: [
    'Кожаное портмоне линейки',
    'Удобное портмоне из натуральной кожи марки',
    'Классическое портмоне бренда',
  ],
  backpacks: [
    'Городской рюкзак с отделением для ноутбука марки',
    'Практичный рюкзак-портфель от',
    'Рюкзак для деловой и повседневной носки бренда',
  ],
  covers: [
    'Эластичный чехол для чемодана',
    'Защитный чехол на чемодан',
    'Чехол для багажа из эластичного материала',
  ],
  belts: [
    'Кожаный ремень бренда',
    'Классический ремень из натуральной кожи марки',
    'Прочный мужской ремень от',
  ],
  'waist-bags': [
    'Поясная сумка для бега и поездок',
    'Компактная сумка на пояс',
    'Лёгкая сумка через плечо или на пояс',
  ],
  misc: [
    'Аксессуар из линейки',
    'Дополнительный товар марки',
    'Полезная мелочь от',
  ],
  sale: [
    'Товар в распродаже',
    'Со скидкой — модель',
    'Из акционного раздела',
  ],
};

const SPEC_INTRO: Record<string, string[]> = {
  default: ['Характеристики:', 'Параметры:', 'Особенности:', 'В деталях:'],
};

const STORE_VARIANTS = [
  'Самовывоз бесплатно — Москва, Сормовский проезд 11, стр. 1. Курьер по Москве и Подмосковью.',
  'Заберите со склада на Сормовском проезде 11 или закажите курьера по Москве и области.',
  'В наличии на складе в Москве (Сормовский 11). Курьерская доставка по Москве; в Подмосковье — по согласованию.',
  'Можно забрать самовывозом на Сормовском 11 либо доставить курьером по МКАД и в Подмосковье.',
];

const FREE_DELIVERY_VARIANTS = [
  'От 20 000 ₽ доставка по Москве — бесплатно.',
  'При заказе от 20 000 ₽ доставка в пределах МКАД — за наш счёт.',
  'Бесплатная доставка по МКАД от 20 000 ₽.',
];

const GUARANTEE_VARIANTS = [
  'Гарантия производителя 1 год.',
  'Гарантия 12 месяцев, сервисный центр на Сормовском.',
  'На товар действует годовая гарантия — ремонт и замену делаем у себя.',
];

function buildSpecsSentence(p: ProductForGen): string {
  if (!p.specs) return '';
  const entries = Object.entries(p.specs).filter(([, v]) => v != null && String(v).trim() !== '');
  if (entries.length === 0) return '';
  const intro = pick(SPEC_INTRO.default, p.id, 'specs-intro');
  const list = entries.slice(0, 5).map(([k, v]) => `${k.toLowerCase()} — ${v}`).join(', ');
  return `${intro} ${list}.`;
}

function buildFactsSentence(p: ProductForGen): string {
  const parts: string[] = [];
  const size = extractSize(p.name);
  const color = extractColor(p.name);
  if (size) parts.push(`размер ${size}`);
  if (color) parts.push(`цвет ${color}`);
  if (parts.length === 0) return '';

  const templates = [
    `${parts.join(', ')}.`,
    `${parts[0][0].toUpperCase() + parts[0].slice(1)}${parts[1] ? ', ' + parts[1] : ''}.`,
    `Доступен в варианте: ${parts.join(', ')}.`,
  ];
  return pick(templates, p.id, 'facts');
}

function buildPriceSentence(p: ProductForGen): string {
  const price = priceFmt(p.price);
  const oldPrice = p.oldPrice && p.oldPrice > p.price ? priceFmt(p.oldPrice) : null;
  if (oldPrice) {
    const templates = [
      `Цена — ${price} ₽ (старая ${oldPrice} ₽).`,
      `Сейчас ${price} ₽, было ${oldPrice} ₽.`,
      `${price} ₽ со скидкой (без скидки — ${oldPrice} ₽).`,
    ];
    return pick(templates, p.id, 'price');
  }
  const templates = [
    `Цена ${price} ₽.`,
    `Стоимость — ${price} ₽.`,
    `${price} ₽ за модель.`,
  ];
  return pick(templates, p.id, 'price');
}

export function generateUniqueDescription(p: ProductForGen): string {
  const opener = pick(OPENERS[p.categoryId] ?? OPENERS.misc, p.id, 'opener');
  const model = modelToken(p);
  const facts = buildFactsSentence(p);
  const specs = buildSpecsSentence(p);
  const price = buildPriceSentence(p);
  const store = pick(STORE_VARIANTS, p.id, 'store');
  const freeDelivery = pick(FREE_DELIVERY_VARIANTS, p.id, 'free');
  const guarantee = pick(GUARANTEE_VARIANTS, p.id, 'guarantee');

  const sentences: string[] = [];
  sentences.push(`${opener} ${p.brand}: ${model}.`);
  if (facts) sentences.push(facts);
  if (specs) sentences.push(specs);
  sentences.push(price);
  sentences.push(store);
  sentences.push(freeDelivery);
  sentences.push(guarantee);

  return sentences.join(' ').replace(/\s+/g, ' ').trim();
}
