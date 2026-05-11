import * as crypto from 'node:crypto';

// English equivalents for category ids — used as the leading slug token.
const CATEGORY_EN: Record<string, string> = {
  suitcases: 'suitcase',
  'women-bags': 'bag',
  briefcases: 'briefcase',
  parts: 'part',
  wallets: 'wallet',
  backpacks: 'backpack',
  covers: 'cover',
  belts: 'belt',
  'waist-bags': 'waist-bag',
  misc: 'accessory',
  sale: 'sale-item',
};

function brandToSlug(brand: string): string {
  return brand
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Pull latin/numeric tokens out of a Russian product name.
// Examples:
//   "Чемодан VIP COLLECTION 14101 Sweet Pink S 20\""
//      → ['vip', 'collection', '14101', 'sweet', 'pink', 's', '20']
//   "Колеса для чемоданов VIP COLLECTION 19-1-20* TURQUOISE"
//      → ['vip', 'collection', '19-1-20', 'turquoise']
function latinTokens(s: string): string[] {
  const matches = s.match(/[A-Za-z0-9][A-Za-z0-9\-.]*/g) || [];
  return matches
    .map((t) => t.toLowerCase().replace(/\./g, '-'))
    .map((t) => t.replace(/-+/g, '-').replace(/^-|-$/g, ''))
    .filter((t) => t.length > 0);
}

function shortHash(input: string): string {
  return crypto.createHash('md5').update(input).digest('hex').slice(0, 6);
}

/**
 * Build an English-flavoured slug for a product.
 * Pattern: <category>-<brand>-<latin-tokens-from-name>-<hash>
 *
 * `stableKey` should be something that does NOT change between scrapes
 * (externalUrl / oldUrl is ideal). It seeds the hash, so the same product
 * always gets the same slug.
 */
export function makeEnglishSlug(opts: {
  name: string;
  brand: string;
  categoryId: string;
  stableKey: string;
}): string {
  const cat = CATEGORY_EN[opts.categoryId] ?? 'product';
  const brand = brandToSlug(opts.brand || '');

  // Drop brand mentions from name so we don't repeat them
  let cleanName = opts.name;
  if (opts.brand) {
    cleanName = cleanName.replace(new RegExp(opts.brand.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'), '');
  }

  const tokens = latinTokens(cleanName)
    .filter((t, i, arr) => arr.indexOf(t) === i) // dedupe
    .slice(0, 5);

  const hash = shortHash(opts.stableKey);

  const parts = [cat, brand, ...tokens, hash].filter(Boolean);
  return parts
    .join('-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}
