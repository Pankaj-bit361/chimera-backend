/**
 * Regenerates the placeholder product SVGs in place — same storage keys, so
 * the Media documents and every URL stay untouched. Surgical alternative to a
 * full re-seed when only the placeholder artwork has changed.
 *
 *   npx tsx src/seed/regenerateProductImages.ts
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { products } from './data/catalogue.js';
import { makeProductImage } from './placeholders.js';

async function main(): Promise<void> {
  const dir = path.resolve(process.cwd(), env.storage.localDir, 'images/products');
  await mkdir(dir, { recursive: true });

  for (const product of products) {
    const sku = product.packSizes[0]?.sku ?? 'CHM-SKU';
    const file = path.join(dir, `${product.slug}.svg`);
    await writeFile(file, makeProductImage(product.name, sku, product.categorySlug));
    logger.info(`regenerated ${product.slug}.svg`);
  }

  logger.info(`${products.length} product images regenerated in ${dir}`);
}

main().catch((error) => {
  logger.error('regeneration failed', error);
  process.exit(1);
});
