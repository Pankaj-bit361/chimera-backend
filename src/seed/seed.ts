import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { storage } from '../adapters/storage/index.js';
import { env } from '../config/env.js';
import { connectDb, disconnectDb } from '../db/connect.js';
import { logger } from '../lib/logger.js';
import { slugify } from '../lib/slug.js';
import { Category } from '../models/Category.js';
import { Certification } from '../models/Certification.js';
import { CountryPage } from '../models/CountryPage.js';
import { Lead } from '../models/Lead.js';
import { Media } from '../models/Media.js';
import { Page } from '../models/Page.js';
import { Post } from '../models/Post.js';
import { Product } from '../models/Product.js';
import { Setting } from '../models/Setting.js';
import { checkPublishable } from '../modules/products/publishRules.js';
import { User, hashPassword } from '../models/User.js';
import { DOCUMENT_KIND_LABELS, type DocumentKind } from '../models/common.js';
import { type SeedProduct, categories, products } from './data/catalogue.js';
import { pages } from './data/pages.js';
import { certifications, countryPages, posts, settings } from './data/site.js';
import {
  PLACEHOLDER_NOTICE,
  makeCertificateImage,
  makePdf,
  makeProductImage,
} from './placeholders.js';

const reset = process.argv.includes('--reset');

/**
 * `--demo` publishes the seeded catalogue so the site can be reviewed with
 * content in it.
 *
 * It does NOT weaken the publish gate — it walks through it, by marking the
 * placeholder spec rows verified. That is a lie, so demo mode also switches on
 * the site-wide banner saying every figure is a placeholder. Never run this
 * against production data.
 */
const demo = process.argv.includes('--demo');

async function uploadImage(key: string, body: Buffer, alt: string, mime = 'image/svg+xml') {
  const stored = await storage.put({ key, body, contentType: mime, gated: false });
  // storageKey is unique, and one photograph can legitimately belong to several
  // products — the four urine-strip SKUs share a range shot. One file, one
  // Media row, many references.
  return Media.findOneAndUpdate(
    { storageKey: stored.key },
    {
      $set: { kind: 'image', originalName: key.split('/').pop(), mime, size: stored.size, gated: false },
      $setOnInsert: { alt },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

const PHOTO_DIR = path.resolve(process.cwd(), 'assets/product-photos');

/**
 * Real photography beats a drawing, and the drawing exists only because there
 * was none. A product that lists `photos` gets them; one that does not gets a
 * schematic stamped AWAITING PHOTOGRAPHY, which is the honest state.
 */
async function uploadProductImages(product: SeedProduct, primarySku: string) {
  const files = product.photos ?? [];
  if (files.length === 0) {
    const placeholder = await uploadImage(
      `images/products/${product.slug}.svg`,
      makeProductImage(product.name, primarySku, product.categorySlug),
      `${product.name} — schematic, awaiting photography`,
    );
    return [placeholder];
  }

  const uploaded = [];
  for (const [index, file] of files.entries()) {
    const body = await readFile(path.join(PHOTO_DIR, file));
    uploaded.push(
      await uploadImage(
        `images/products/${file}`,
        body,
        index === 0
          ? `${product.name} — product photograph`
          : `${product.name} — product photograph ${index + 1}`,
        'image/jpeg',
      ),
    );
  }
  return uploaded;
}

async function uploadDocument(key: string, body: Buffer, kind: DocumentKind, name: string) {
  const stored = await storage.put({ key, body, contentType: 'application/pdf', gated: true });
  return Media.create({
    kind: 'document',
    documentKind: kind,
    storageKey: stored.key,
    originalName: name,
    mime: 'application/pdf',
    size: stored.size,
    alt: '',
    gated: true,
  });
}

async function seed(): Promise<void> {
  await connectDb();

  if (reset) {
    logger.warn('--reset: clearing all collections');
    await Promise.all([
      Category.deleteMany({}),
      Product.deleteMany({}),
      Media.deleteMany({}),
      Page.deleteMany({}),
      Post.deleteMany({}),
      Certification.deleteMany({}),
      CountryPage.deleteMany({}),
      Setting.deleteMany({}),
      User.deleteMany({}),
      Lead.deleteMany({}),
    ]);
  }

  // ── Users (§7 A1–A3) ──────────────────────────────────────────────────────
  const owner = await User.findOneAndUpdate(
    { email: env.seed.ownerEmail },
    {
      $setOnInsert: {
        name: 'Chimera Owner',
        email: env.seed.ownerEmail,
        role: 'owner',
        active: true,
        passwordHash: await hashPassword(env.seed.ownerPassword),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  for (const [email, name, role] of [
    [`editor@${env.mail.domain}`, 'Content Editor', 'editor'],
    [`sales@${env.mail.domain}`, 'Sales Desk', 'sales'],
  ] as const) {
    await User.findOneAndUpdate(
      { email },
      {
        $setOnInsert: {
          name,
          email,
          role,
          active: true,
          passwordHash: await hashPassword(env.seed.ownerPassword),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  logger.info(`users ready — owner ${owner.email}`);

  // ── Categories ────────────────────────────────────────────────────────────
  const categoryBySlug = new Map<string, string>();
  for (const category of categories) {
    const doc = await Category.findOneAndUpdate(
      { slug: category.slug },
      { ...category, status: 'published' },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    categoryBySlug.set(category.slug, String(doc!._id));
  }
  logger.info(`categories: ${categories.length}`);

  // ── Products, with placeholder media ──────────────────────────────────────
  const productBySlug = new Map<string, string>();

  for (const product of products) {
    const categoryId = categoryBySlug.get(product.categorySlug);
    if (!categoryId) throw new Error(`Unknown category ${product.categorySlug}`);

    const primarySku = product.packSizes[0]?.sku ?? 'CHM-SKU';
    const images = await uploadProductImages(product, primarySku);
    const image = images[0];

    const documents = [];
    for (const kind of product.documents) {
      const media = await uploadDocument(
        `documents/${kind}/${product.slug}-${kind}.pdf`,
        makePdf(`${product.name} — ${DOCUMENT_KIND_LABELS[kind]}`, [
          ...PLACEHOLDER_NOTICE,
          `Product: ${product.name}`,
          `SKU (primary pack): ${primarySku}`,
          `Category: ${product.categorySlug}`,
          '',
          'Specifications as seeded (all UNVERIFIED):',
          ...product.specs.map((spec) => `  ${spec.label}: ${spec.value}${spec.unit ? ` ${spec.unit}` : ''}`),
        ]),
        kind,
        `${product.slug}-${kind}.pdf`,
      );
      documents.push({ kind, label: DOCUMENT_KIND_LABELS[kind], media: media._id });
    }

    const doc = await Product.findOneAndUpdate(
      { slug: product.slug },
      {
        name: product.name,
        slug: product.slug,
        category: categoryId,
        shortDescription: product.shortDescription,
        intendedUse: product.intendedUse,
        analytes: product.analytes,
        sampleTypes: product.sampleTypes,
        method: product.method,
        format: product.format,
        specs: product.specs.map((spec, index) => ({
          slug: slugify(spec.label),
          label: spec.label,
          value: spec.value,
          unit: spec.unit ?? '',
          group: spec.group,
          order: index,
          key: Boolean(spec.key),
          // The whole point: nothing here has been checked against a document.
          verified: demo,
          evidence: demo ? 'DEMO DATA — not evidenced' : '',
        })),
        packSizes: product.packSizes.map((pack, index) => ({ ...pack, order: index })),
        regulatory: {
          cdscoLicenceNo: '',
          icmrRegistrationNo: '',
          iso13485: '',
          iso9001: '',
          ceMark: '',
          gmp: '',
          notes: 'Certificate numbers pending — see DECISIONS.md D3.',
        },
        images: images.map((media) => media._id),
        documents,
        seo: product.seo,
        featured: Boolean(product.featured),
        // Written as draft first. Demo mode publishes below, but only through
        // the gate — see the comment at the top of this file.
        status: product.status,
        publishedAt: undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    /*
     * Demo mode is supposed to walk THROUGH the publish gate, not around it.
     * It used to write `status: 'published'` straight to Mongo, which meant a
     * product with no analyte at all — the RAPiDVUE platform entry — went live
     * on a medical-device site. Now the same function the API uses decides,
     * and anything that fails stays draft with its blockers logged.
     */
    if (demo && product.status === 'draft') {
      const category = await Category.findById(categoryId);
      const check = checkPublishable(doc!, category);
      if (check.publishable) {
        doc!.status = 'published';
        doc!.publishedAt = new Date();
        await doc!.save();
      } else {
        logger.warn(`  ${product.slug} stays draft — ${check.blockers.map((b) => `${b.field}: ${b.message}`).join('; ')}`);
      }
    }

    productBySlug.set(product.slug, String(doc!._id));
  }
  logger.info(`products: ${products.length} ${demo ? "(demo — published with placeholder figures)" : "(all draft/roadmap — specs are unverified by design)"}`);

  // Related products: same category, excluding self.
  for (const product of products) {
    const siblings = products
      .filter((other) => other.categorySlug === product.categorySlug && other.slug !== product.slug)
      .slice(0, 3)
      .map((other) => productBySlug.get(other.slug))
      .filter(Boolean);
    await Product.updateOne({ slug: product.slug }, { relatedProducts: siblings });
  }

  // ── Pages ─────────────────────────────────────────────────────────────────
  for (const page of pages) {
    await Page.findOneAndUpdate(
      { key: page.key },
      {
        ...page,
        // Legal pages stay draft even in demo mode — they need a lawyer, and
        // publishing unreviewed legal text is the one thing worse than not
        // having it (§8, "an exposure, not just a gap").
        status: demo && !page.key.includes('policy') && !page.key.includes('terms') && page.key !== 'disclaimer'
          ? 'published'
          : page.status,
        updatedBy: owner._id,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  logger.info(`pages: ${pages.length}`);

  // ── Certifications ────────────────────────────────────────────────────────
  for (const [index, cert] of certifications.entries()) {
    const file = await uploadImage(
      `images/certifications/${slugify(cert.name)}.svg`,
      makeCertificateImage(cert.name, cert.issuer),
      `${cert.name} certificate — placeholder`,
    );
    await Certification.findOneAndUpdate(
      { name: cert.name },
      {
        ...cert,
        number: demo ? `DEMO-${String(index + 1).padStart(4, '0')}` : cert.number,
        validTill: demo ? new Date(Date.now() + 730 * 86_400_000) : undefined,
        status: demo ? 'published' : cert.status,
        certificateFile: file._id,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  logger.info(
    `certifications: ${certifications.length} ${demo ? '(demo numbers)' : '(draft — no numbers on file yet)'}`,
  );

  // ── Export country pages ──────────────────────────────────────────────────
  for (const [index, page] of countryPages.entries()) {
    const focus = ['viral-transport-medium', 'urine-strips-10-parameter', 'hcg-pregnancy-rapid-test']
      .map((slug) => productBySlug.get(slug))
      .filter(Boolean);

    await CountryPage.findOneAndUpdate(
      { countryCode: page.countryCode },
      {
        country: page.country,
        countryCode: page.countryCode,
        slug: slugify(`${page.country}-diagnostic-kit-supplier`),
        intro: page.intro,
        regulatoryNotes: page.regulatoryNotes,
        focusProducts: focus,
        logistics: { ports: page.ports, incoterms: ['FOB', 'CIF'], leadTime: '3–5 working days to dispatch' },
        seo: {
          title: `Diagnostic Kit Supplier & Exporter to ${page.country} | Chimera Biotech`,
          description: `Chimera Biotech exports rapid test kits, urine reagent strips and viral transport media to ${page.country}. FOB and CIF terms, registration documentation supplied.`,
        },
        order: index,
        status: 'published',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  logger.info(`export country pages: ${countryPages.length}`);

  // ── Blog ──────────────────────────────────────────────────────────────────
  for (const post of posts) {
    const related = post.relatedSlugs.map((slug) => productBySlug.get(slug)).filter(Boolean);
    await Post.findOneAndUpdate(
      { slug: post.slug },
      {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        body: post.body,
        tags: post.tags,
        author: 'Chimera Biotech',
        relatedProducts: related,
        seo: post.seo,
        // Drafts: the products they link to are not published yet either.
        status: demo ? 'published' : 'draft',
        publishedAt: demo ? new Date() : undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  logger.info(`posts: ${posts.length} ${demo ? "(published)" : "(draft)"}`);

  // ── Settings ──────────────────────────────────────────────────────────────
  for (const setting of settings) {
    const value =
      demo && setting.key === 'banner'
        ? {
            enabled: true,
            text: 'Demonstration data — every figure on this site is a placeholder, not a Chimera measurement.',
            href: '',
            label: '',
          }
        : setting.value;

    await Setting.findOneAndUpdate(
      { key: setting.key },
      { key: setting.key, value, updatedBy: owner._id },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  logger.info(`settings: ${settings.length}`);

  logger.info('');
  logger.info('─────────────────────────────────────────────────────────────');
  logger.info(`Dashboard sign-in:  ${env.seed.ownerEmail}`);
  logger.info(`Password:           ${env.seed.ownerPassword}`);
  logger.info('');
  if (demo) {
    logger.warn('DEMO MODE — the catalogue is published with UNEVIDENCED numbers.');
    logger.warn('The site-wide banner says so. Re-run `npm run seed:reset` before');
    logger.warn('any real content work, and never point this at production.');
  } else {
    logger.info('Every product is a DRAFT. That is intentional: the API refuses');
    logger.info('to publish a product with unverified spec rows. Open one in the');
    logger.info('dashboard, replace the placeholder numbers with real ones, tick');
    logger.info('"verified" on each row, then publish.');
    logger.info('');
    logger.info('To see the site with content in it: npm run seed:demo');
  }
  logger.info('─────────────────────────────────────────────────────────────');

  await disconnectDb();
}

seed().catch(async (error) => {
  logger.error('seed failed', error);
  await disconnectDb();
  process.exit(1);
});
