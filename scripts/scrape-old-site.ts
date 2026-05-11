/* eslint-disable no-console */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import * as cheerio from 'cheerio';
import { makeEnglishSlug } from '../src/lib/slug';
import { cleanDescription } from '../src/lib/clean-description';

const BASE = 'https://www.vip-collection.ru';
const OUT_DIR = path.resolve('tmp-recon');
const IMG_DIR = path.join(OUT_DIR, 'images');
const JSON_PATH = path.join(OUT_DIR, 'products.json');

interface CategoryMap {
  oldSlug: string;
  newId: string; // matches Category.id in our DB
}

const CATEGORIES: CategoryMap[] = [
  { oldSlug: 'chemodany-kejs-piloty', newId: 'suitcases' },
  { oldSlug: 'zhenskie-sumki', newId: 'women-bags' },
  { oldSlug: 'portfeli-sumki-dorozhnye', newId: 'briefcases' },
  { oldSlug: 'zapchasti-dlya-chemodanov', newId: 'parts' },
  { oldSlug: 'portmone-vizitnitsy-oblozhki', newId: 'wallets' },
  { oldSlug: 'ryukzaki-sumki-dlya-noutbuka', newId: 'backpacks' },
  { oldSlug: 'aksessuary-dlya-chemodanov', newId: 'covers' },
  { oldSlug: 'remni-muzhskie-i-zhenskie', newId: 'belts' },
  { oldSlug: 'podarki-i-raznoe', newId: 'misc' },
  { oldSlug: 'sumki-na-poyas-dlya-bega-fitnesa', newId: 'waist-bags' },
  { oldSlug: 'rasprodazha', newId: 'sale' },
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ru-RU,ru;q=0.9',
};

async function fetchHtml(url: string): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (attempt === 2) throw e;
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw new Error('unreachable');
}

async function fetchBuffer(url: string): Promise<Buffer> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (attempt === 2) throw e;
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw new Error('unreachable');
}

function safeFilenameFromName(s: string): string {
  // Used only for image filenames; not the product slug.
  const transliterated = s
    .toLowerCase()
    .replace(/[а-я]/g, (c) => {
      const map: Record<string, string> = {
        а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i',
        й: 'j', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
        у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y',
        ь: '', э: 'e', ю: 'yu', я: 'ya',
      };
      return map[c] ?? c;
    })
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const hash = crypto.createHash('md5').update(s).digest('hex').slice(0, 6);
  return `${transliterated.slice(0, 50)}-${hash}`;
}

function parsePrice(s: string): number {
  const n = parseFloat(s.replace(/[^\d.,]/g, '').replace(/[',](\d{3})/g, '$1').replace(',', '.'));
  return isFinite(n) ? Math.round(n) : 0;
}

interface ScrapedProduct {
  oldUrl: string;
  oldCategorySlug: string;
  newCategoryId: string;
  name: string;
  slug: string;
  price: number;
  oldPrice: number;
  brand: string;
  description: string;
  specs: Record<string, string>;
  imageUrls: string[];
  localImages: string[];
}

async function scrapeCategory(cat: CategoryMap): Promise<string[]> {
  const html = await fetchHtml(`${BASE}/katalog/${cat.oldSlug}`);
  const $ = cheerio.load(html);
  const links = new Set<string>();
  const prefix = `/katalog/${cat.oldSlug}/`;
  $('a').each((_, a) => {
    const href = $(a).attr('href');
    if (href && href.startsWith(prefix) && href.length > prefix.length) {
      const clean = href.split('?')[0].split('#')[0].replace(/\/$/, '');
      links.add(clean);
    }
  });
  return Array.from(links);
}

async function scrapeProduct(productPath: string, cat: CategoryMap): Promise<ScrapedProduct | null> {
  const url = `${BASE}${productPath}`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const name = $('h1').first().text().trim().replace(/\s+/g, ' ');
  if (!name) return null;

  const brandRaw = $('.manufacturer_name span').first().text().trim();
  const brand = brandRaw ? brandRaw.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim() : '';

  const price = parsePrice($('#block_price').first().text());
  const oldPrice = parsePrice($('#old_price').first().text());

  const descriptionRaw = $('.jshop_prod_description').first().text().trim().replace(/\s+/g, ' ').slice(0, 8000);
  const description = cleanDescription(descriptionRaw).slice(0, 4000);

  const specs: Record<string, string> = {};
  $('.extra_fields .name').each((_, el) => {
    const k = $(el).text().trim().replace(/:\s*$/, '');
    const v = $(el).next('.value').text().trim();
    if (k && v) specs[k] = v;
  });

  const imgUrls = new Set<string>();
  $('a.lightbox').each((_, a) => {
    const href = $(a).attr('href');
    if (href && /\/img_products\/full_/.test(href)) imgUrls.add(href);
  });
  if (imgUrls.size === 0) {
    $('img[src*="/img_products/"]').each((_, img) => {
      const src = $(img).attr('src');
      if (src && !src.includes('/thumb_')) {
        imgUrls.add(src.startsWith('http') ? src : `${BASE}${src}`);
      }
    });
  }
  const imageUrls = Array.from(imgUrls).slice(0, 10);

  const slug = makeEnglishSlug({ name, brand, categoryId: cat.newId, stableKey: url });
  const fileBase = safeFilenameFromName(name);
  const localImages: string[] = [];
  for (let i = 0; i < imageUrls.length; i++) {
    const u = imageUrls[i];
    const ext = (path.extname(new URL(u).pathname).toLowerCase() || '.jpg').slice(0, 5);
    const fileName = `${fileBase}-${i + 1}${ext}`;
    const localRel = `${cat.newId}/${fileName}`;
    const localAbs = path.join(IMG_DIR, localRel);
    try {
      await fs.mkdir(path.dirname(localAbs), { recursive: true });
      const buf = await fetchBuffer(u);
      await fs.writeFile(localAbs, buf);
      localImages.push(localRel);
    } catch (e) {
      console.warn(`    img fail: ${u}: ${(e as Error).message}`);
    }
  }

  return {
    oldUrl: url,
    oldCategorySlug: cat.oldSlug,
    newCategoryId: cat.newId,
    name,
    slug,
    price,
    oldPrice: oldPrice > 0 ? oldPrice : 0,
    brand,
    description,
    specs,
    imageUrls,
    localImages,
  };
}

async function main() {
  await fs.mkdir(IMG_DIR, { recursive: true });

  const onlyCat = process.argv[2];
  const cats = onlyCat ? CATEGORIES.filter((c) => c.oldSlug === onlyCat) : CATEGORIES;
  if (cats.length === 0) {
    console.error(`No category matches: ${onlyCat}`);
    console.error(`Known: ${CATEGORIES.map((c) => c.oldSlug).join(', ')}`);
    process.exit(1);
  }

  const all: ScrapedProduct[] = [];
  const seen = new Set<string>();

  for (const cat of cats) {
    console.log(`\n[cat] ${cat.oldSlug}`);
    let paths: string[];
    try {
      paths = await scrapeCategory(cat);
    } catch (e) {
      console.warn(`  ✗ category fetch: ${(e as Error).message}`);
      continue;
    }
    console.log(`  found ${paths.length} product links`);

    for (const p of paths) {
      const full = `${BASE}${p}`;
      if (seen.has(full)) continue;
      seen.add(full);
      try {
        const data = await scrapeProduct(p, cat);
        if (data) {
          all.push(data);
          console.log(`  ✓ ${data.name.slice(0, 60)} | ${data.price} ₽ | ${data.localImages.length} img`);
        } else {
          console.warn(`  ⚠ no name: ${p}`);
        }
      } catch (e) {
        console.warn(`  ✗ ${p}: ${(e as Error).message}`);
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  await fs.writeFile(JSON_PATH, JSON.stringify(all, null, 2), 'utf-8');
  console.log(`\nDone: ${all.length} products → ${JSON_PATH}`);
  console.log(`Images: ${IMG_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
