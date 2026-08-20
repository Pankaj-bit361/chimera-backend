/**
 * Re-creates every seed-derived file in LOCAL storage, deterministically and
 * without touching the database.
 *
 * Why: with STORAGE_DRIVER=local the bytes live on the instance disk, which is
 * empty on every fresh Elastic Beanstalk deploy while the Media rows (and their
 * storage keys) persist in Mongo. Running this on deploy puts the files back
 * under the same keys, so nothing 404s. No-op under the S3 driver.
 *
 *   node dist/seed/materialize.js      (predeploy hook)
 *   npx tsx src/seed/materialize.ts    (local)
 *
 * Files written: product photos (from assets/product-photos), schematic SVGs
 * for products without photos, certificate SVGs, and the placeholder IFU/COA/
 * MSDS PDFs — exactly what seed.ts writes, under exactly the same keys.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { storage } from '../adapters/storage/index.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { slugify } from '../lib/slug.js';
import { DOCUMENT_KIND_LABELS } from '../models/common.js';
import { products } from './data/catalogue.js';
import { certifications } from './data/site.js';
import {
  PLACEHOLDER_NOTICE,
  makeCertificateImage,
  makePdf,
  makeProductImage,
} from './placeholders.js';

const PHOTO_DIR = path.resolve(process.cwd(), 'assets/product-photos');

async function main(): Promise<void> {
  if (env.storage.driver !== 'local') {
    logger.info(`materialize: storage driver is ${env.storage.driver} — nothing to do`);
    return;
  }
  let written = 0;

  for (const product of products) {
    const primarySku = product.packSizes[0]?.sku ?? 'CHM-SKU';
    const photos = product.photos ?? [];
    if (photos.length === 0) {
      await storage.put({
        key: `images/products/${product.slug}.svg`,
        body: makeProductImage(product.name, primarySku, product.categorySlug),
        contentType: 'image/svg+xml',
        gated: false,
      });
      written += 1;
    } else {
      for (const file of photos) {
        await storage.put({
          key: `images/products/${file}`,
          body: await readFile(path.join(PHOTO_DIR, file)),
          contentType: 'image/jpeg',
          gated: false,
        });
        written += 1;
      }
    }
    for (const kind of product.documents) {
      await storage.put({
        key: `documents/${kind}/${product.slug}-${kind}.pdf`,
        body: makePdf(`${product.name} — ${DOCUMENT_KIND_LABELS[kind]}`, [
          ...PLACEHOLDER_NOTICE,
          `Product: ${product.name}`,
          `SKU (primary pack): ${primarySku}`,
          `Category: ${product.categorySlug}`,
          '',
          'Specifications as seeded (all UNVERIFIED):',
          ...product.specs.map((spec) => `  ${spec.label}: ${spec.value}${spec.unit ? ` ${spec.unit}` : ''}`),
        ]),
        contentType: 'application/pdf',
        gated: true,
      });
      written += 1;
    }
  }

  for (const cert of certifications) {
    await storage.put({
      key: `images/certifications/${slugify(cert.name)}.svg`,
      body: makeCertificateImage(cert.name, cert.issuer),
      contentType: 'image/svg+xml',
      gated: false,
    });
    written += 1;
  }

  logger.info(`materialize: ${written} files written under ${path.resolve(process.cwd(), env.storage.localDir)}`);
}

main().catch((error) => {
  logger.error('materialize failed', error);
  process.exit(1);
});
