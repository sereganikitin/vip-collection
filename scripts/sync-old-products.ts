/* eslint-disable no-console */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { generateUniqueDescription } from '../src/lib/description-generator';

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
  const safe = (name || 'VIP COLLECTION').trim();
  const target = normalize(safe);
  const all = await prisma.brand.findMany();
  const m = all.find((b) => normalize(b.name) === target);
  if (m) return m.id;
  const id = safe.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `brand-${Date.now()}`;
  console.log(`  + new brand: "${safe}" (id=${id})`);
  return (await prisma.brand.create({ data: { id, name: safe, isActive: true } })).id;
}

async function copyImages(
  sp: ScrapedProduct,
  imagesDir: string,
  uploadRoot: string,
): Promise<string[]> {
  const dir = path.join(uploadRoot, sp.newCategoryId);
  await fs.mkdir(dir, { recursive: true });
  const result: string[] = [];
  for (const rel of sp.localImages) {
    const src = path.join(imagesDir, rel);
    const fname = path.basename(rel);
    const dst = path.join(dir, fname);
    try {
      await fs.copyFile(src, dst);
      result.push(`/uploads/products/legacy/${sp.newCategoryId}/${fname}`);
    } catch (e) {
      console.warn(`    img copy fail: ${src}: ${(e as Error).message}`);
    }
  }
  return result;
}

interface ExistingProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  oldPrice: number | null;
  description: string;
  images: string[];
  externalUrl: string | null;
  noSync: boolean;
}

function imagesEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (path.basename(a[i]) !== path.basename(b[i])) return false;
  }
  return true;
}

async function main() {
  const jsonPath = process.argv[2];
  const imagesDir = process.argv[3];
  const uploadRoot = process.argv[4] || UPLOAD_ROOT_DEFAULT;

  if (!jsonPath || !imagesDir) {
    console.error('Usage: tsx sync-old-products.ts <products.json> <images-dir> [upload-root]');
    process.exit(1);
  }

  const syncStart = new Date();
  const data: ScrapedProduct[] = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));
  console.log(`Loaded ${data.length} scraped products`);

  const dbProducts = await prisma.product.findMany({
    select: {
      id: true, slug: true, name: true, price: true, oldPrice: true,
      description: true, images: true, externalUrl: true, noSync: true,
    },
  });
  const byUrl = new Map<string, ExistingProduct>();
  const bySlug = new Map<string, ExistingProduct>();
  const byNorm = new Map<string, ExistingProduct>();
  for (const p of dbProducts) {
    if (p.externalUrl) byUrl.set(p.externalUrl, p);
    bySlug.set(p.slug, p);
    byNorm.set(normalize(p.name), p);
  }
  console.log(`DB has ${dbProducts.length} products (${byUrl.size} with externalUrl)`);

  const seenIds = new Set<string>();
  let created = 0, updated = 0, unchanged = 0, skippedNoSync = 0, failed = 0;

  for (const sp of data) {
    try {
      const match =
        byUrl.get(sp.oldUrl) ||
        bySlug.get(sp.slug) ||
        byNorm.get(normalize(sp.name));

      if (match) {
        seenIds.add(match.id);
        if (match.noSync) {
          // backfill externalUrl even if noSync, to register the product
          if (!match.externalUrl) {
            await prisma.product.update({
              where: { id: match.id },
              data: { externalUrl: sp.oldUrl, lastSyncAt: syncStart },
            });
          } else {
            await prisma.product.update({
              where: { id: match.id },
              data: { lastSyncAt: syncStart },
            });
          }
          skippedNoSync++;
          continue;
        }

        const diff: Record<string, unknown> = {};
        if (Math.round(match.price) !== sp.price) diff.price = sp.price;
        const newOld = sp.oldPrice > 0 ? sp.oldPrice : null;
        if ((match.oldPrice ?? null) !== newOld) diff.oldPrice = newOld;
        if (match.name !== sp.name) diff.name = sp.name;

        // Description is always regenerated from current product fields —
        // we never copy the legacy site's wording into our DB, otherwise the
        // sites become duplicates again.
        const nextName = (diff.name as string | undefined) ?? match.name;
        const nextPrice = (diff.price as number | undefined) ?? match.price;
        const nextOldPrice =
          diff.oldPrice !== undefined ? (diff.oldPrice as number | null) : match.oldPrice;
        const regeneratedDesc = generateUniqueDescription({
          id: match.id,
          name: nextName,
          brand: sp.brand,
          categoryId: sp.newCategoryId,
          price: nextPrice,
          oldPrice: nextOldPrice,
          specs: sp.specs,
          externalUrl: sp.oldUrl,
        });
        if (regeneratedDesc !== match.description) diff.description = regeneratedDesc;

        let newImages: string[] | undefined;
        if (!imagesEqual(match.images, sp.localImages)) {
          newImages = await copyImages(sp, imagesDir, uploadRoot);
        }

        const needsUpdate =
          Object.keys(diff).length > 0 ||
          newImages !== undefined ||
          match.externalUrl !== sp.oldUrl;

        if (needsUpdate) {
          await prisma.product.update({
            where: { id: match.id },
            data: {
              ...diff,
              ...(newImages ? { images: newImages } : {}),
              externalUrl: sp.oldUrl,
              isActive: true,
              isSale: (sp.oldPrice > 0 && sp.oldPrice > sp.price) || undefined,
              lastSyncAt: syncStart,
            },
          });
          updated++;
          const changed = [
            ...Object.keys(diff),
            ...(newImages ? ['images'] : []),
            ...(match.externalUrl !== sp.oldUrl ? ['externalUrl'] : []),
          ].join(',');
          console.log(`  ~ ${sp.name.slice(0, 50)} | changed: ${changed}`);
        } else {
          await prisma.product.update({
            where: { id: match.id },
            data: { lastSyncAt: syncStart },
          });
          unchanged++;
        }
      } else {
        const cat = await prisma.category.findUnique({ where: { id: sp.newCategoryId } });
        if (!cat) {
          console.warn(`  ✗ ${sp.slug}: no category ${sp.newCategoryId}`);
          failed++;
          continue;
        }
        const brandId = await findOrCreateBrand(sp.brand);
        const finalImages = await copyImages(sp, imagesDir, uploadRoot);

        // Generate the unique description up front. externalUrl seeds the
        // fragment picker so the same legacy product always produces the
        // same description across sync runs and the initial uniquify pass.
        const generatedDesc = generateUniqueDescription({
          id: '',
          name: sp.name,
          brand: sp.brand,
          categoryId: sp.newCategoryId,
          price: sp.price,
          oldPrice: sp.oldPrice > 0 ? sp.oldPrice : null,
          specs: sp.specs,
          externalUrl: sp.oldUrl,
        });

        const newProd = await prisma.product.create({
          data: {
            name: sp.name,
            slug: sp.slug,
            price: sp.price,
            oldPrice: sp.oldPrice > 0 ? sp.oldPrice : null,
            images: finalImages,
            description: generatedDesc,
            specs: sp.specs,
            inStock: sp.price > 0,
            isNew: false,
            isSale: sp.oldPrice > sp.price && sp.oldPrice > 0,
            isActive: true,
            categoryId: sp.newCategoryId,
            brandId,
            externalUrl: sp.oldUrl,
            lastSyncAt: syncStart,
          },
        });
        seenIds.add(newProd.id);
        created++;
        console.log(`  + ${sp.name.slice(0, 50)} | ${sp.price} ₽ | ${finalImages.length} img`);
      }
    } catch (e) {
      console.error(`  ✗ ${sp.slug}: ${(e as Error).message}`);
      failed++;
    }
  }

  // Deactivate products that have externalUrl set, are not in noSync, and were not seen in this run
  const stale = await prisma.product.findMany({
    where: {
      externalUrl: { not: null },
      noSync: false,
      isActive: true,
      id: { notIn: Array.from(seenIds) },
    },
    select: { id: true, name: true },
  });
  let deactivated = 0;
  for (const p of stale) {
    await prisma.product.update({ where: { id: p.id }, data: { isActive: false } });
    deactivated++;
    console.log(`  - ${p.name.slice(0, 50)} | deactivated (gone from source)`);
  }

  console.log(
    `\nResult: created=${created}, updated=${updated}, unchanged=${unchanged}, ` +
    `deactivated=${deactivated}, skippedNoSync=${skippedNoSync}, failed=${failed}`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
