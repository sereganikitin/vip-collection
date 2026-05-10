/* eslint-disable no-console */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const UPLOAD_ROOT_DEFAULT = '/var/www/vip-collection/uploads/products/legacy';

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

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s_-]+/g, '');
}

async function findOrCreateBrand(name: string): Promise<string> {
  const safeName = (name || 'VIP COLLECTION').trim();
  const target = normalize(safeName);
  const all = await prisma.brand.findMany();
  const match = all.find((b) => normalize(b.name) === target);
  if (match) return match.id;
  const id = safeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `brand-${Date.now()}`;
  console.log(`  + new brand: "${safeName}" (id=${id})`);
  return (await prisma.brand.create({ data: { id, name: safeName, isActive: true } })).id;
}

async function main() {
  const jsonPath = process.argv[2];
  const imagesDir = process.argv[3];
  const uploadRoot = process.argv[4] || UPLOAD_ROOT_DEFAULT;

  if (!jsonPath || !imagesDir) {
    console.error('Usage: tsx import-old-products.ts <products.json> <images-dir> [upload-root]');
    process.exit(1);
  }

  const data: ScrapedProduct[] = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));
  console.log(`Loaded ${data.length} scraped products from ${jsonPath}`);

  const existing = await prisma.product.findMany({ select: { slug: true, name: true } });
  const existingSlugs = new Set(existing.map((p) => p.slug));
  const existingNames = new Set(existing.map((p) => normalize(p.name)));
  console.log(`DB has ${existing.length} existing products`);

  let created = 0, skippedSlug = 0, skippedName = 0, failed = 0;

  for (const sp of data) {
    if (existingSlugs.has(sp.slug)) {
      skippedSlug++;
      continue;
    }
    if (existingNames.has(normalize(sp.name))) {
      skippedName++;
      continue;
    }
    try {
      const cat = await prisma.category.findUnique({ where: { id: sp.newCategoryId } });
      if (!cat) {
        console.warn(`  ✗ ${sp.slug}: no category ${sp.newCategoryId}`);
        failed++;
        continue;
      }

      const brandId = await findOrCreateBrand(sp.brand);

      const productImgDir = path.join(uploadRoot, sp.newCategoryId);
      await fs.mkdir(productImgDir, { recursive: true });
      const finalImages: string[] = [];
      for (const rel of sp.localImages) {
        const src = path.join(imagesDir, rel);
        const fname = path.basename(rel);
        const dst = path.join(productImgDir, fname);
        try {
          await fs.copyFile(src, dst);
          finalImages.push(`/uploads/products/legacy/${sp.newCategoryId}/${fname}`);
        } catch (e) {
          console.warn(`    img copy fail: ${src}: ${(e as Error).message}`);
        }
      }

      await prisma.product.create({
        data: {
          name: sp.name,
          slug: sp.slug,
          price: sp.price,
          oldPrice: sp.oldPrice > 0 ? sp.oldPrice : null,
          images: finalImages,
          description: sp.description,
          specs: sp.specs,
          inStock: sp.price > 0,
          isNew: false,
          isSale: sp.oldPrice > sp.price,
          isActive: true,
          categoryId: sp.newCategoryId,
          brandId,
        },
      });
      created++;
      existingSlugs.add(sp.slug);
      existingNames.add(normalize(sp.name));
      console.log(`  ✓ ${sp.name.slice(0, 60)} | ${sp.price} ₽ | ${finalImages.length} img`);
    } catch (e) {
      console.error(`  ✗ ${sp.slug}: ${(e as Error).message}`);
      failed++;
    }
  }

  console.log(`\nResult: created=${created}, skippedBySlug=${skippedSlug}, skippedByName=${skippedName}, failed=${failed}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
