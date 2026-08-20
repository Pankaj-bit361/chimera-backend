import type { CategoryDoc } from '../../models/Category.js';
import type { ProductDoc } from '../../models/Product.js';

/**
 * §9 8.1 — "a product cannot be published without a minimum spec set. This is
 * enforced in the API, not left to editor discipline."
 *
 * This module is the whole enforcement. It is pure: given a product and its
 * category it returns what is missing, so the same function backs the API's
 * 422 and the dashboard's publish bar. One rule set, two surfaces, no drift.
 */

/** Required regardless of category — the fields the audit found missing. */
const BASE_REQUIRED_SPECS = ['shelf-life', 'storage-temperature'] as const;

export type PublishBlocker = {
  field: string;
  message: string;
};

export type PublishCheck = {
  publishable: boolean;
  blockers: PublishBlocker[];
};

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function checkPublishable(product: ProductDoc, category: CategoryDoc | null): PublishCheck {
  const blockers: PublishBlocker[] = [];

  // — Identity: the twelve-word description problem (§1.1) —
  if (!hasText(product.shortDescription)) {
    blockers.push({
      field: 'shortDescription',
      message: 'A short description is required — it must state what the kit detects.',
    });
  } else if (product.shortDescription.trim().split(/\s+/).length < 12) {
    blockers.push({
      field: 'shortDescription',
      message: 'Short description is under 12 words. State the analyte, sample type and method.',
    });
  }

  if (!product.analytes?.length) {
    blockers.push({ field: 'analytes', message: 'At least one analyte is required.' });
  }
  if (!product.sampleTypes?.length) {
    blockers.push({ field: 'sampleTypes', message: 'At least one sample type is required.' });
  }
  if (!hasText(product.method)) {
    blockers.push({ field: 'method', message: 'Method is required (e.g. lateral flow immunoassay).' });
  }
  if (!hasText(product.format)) {
    blockers.push({ field: 'format', message: 'Format is required (e.g. cassette, strip, tube).' });
  }
  if (!hasText(product.intendedUse)) {
    blockers.push({ field: 'intendedUse', message: 'Intended use statement is required.' });
  }

  // — Spec table: the core deliverable —
  const required = new Set<string>([
    ...BASE_REQUIRED_SPECS,
    ...(category?.requiredSpecs ?? []),
  ]);
  const bySlug = new Map((product.specs ?? []).map((spec) => [spec.slug, spec]));

  for (const slug of required) {
    const spec = bySlug.get(slug);
    if (!spec) {
      blockers.push({
        field: `specs.${slug}`,
        message: `Missing required spec "${slug}" for this category.`,
      });
      continue;
    }
    if (!hasText(spec.value)) {
      blockers.push({ field: `specs.${slug}`, message: `"${spec.label}" has no value.` });
    }
  }

  // §12 Compliance — no medical claim published without a supporting document.
  const unverified = (product.specs ?? []).filter((spec) => !spec.verified);
  if (unverified.length > 0) {
    blockers.push({
      field: 'specs.verified',
      message: `${unverified.length} spec ${
        unverified.length === 1 ? 'row is' : 'rows are'
      } unverified: ${unverified.map((s) => s.label).join(', ')}. Verify against a document on file before publishing.`,
    });
  }

  // §6.7 rule 02 — phenol appears once per viewport, at most.
  const keyRows = (product.specs ?? []).filter((spec) => spec.key);
  if (keyRows.length > 4) {
    blockers.push({
      field: 'specs.key',
      message: `${keyRows.length} rows are marked key. Maximum 4 — if everything is emphasised, nothing is.`,
    });
  }

  // — Commercial: a buyer cannot raise a PO without a SKU —
  if (!product.packSizes?.length) {
    blockers.push({ field: 'packSizes', message: 'At least one pack size with a SKU is required.' });
  } else {
    product.packSizes.forEach((pack, index) => {
      if (!hasText(pack.sku)) {
        blockers.push({ field: `packSizes.${index}.sku`, message: `Pack "${pack.label}" has no SKU.` });
      }
      if (!hasText(pack.hsn)) {
        blockers.push({ field: `packSizes.${index}.hsn`, message: `Pack "${pack.label}" has no HSN code.` });
      }
    });
  }

  // — Trust: an IFU is what a lab buyer needs before a PO (§9 8.2) —
  const hasIfu = (product.documents ?? []).some((doc) => doc.kind === 'ifu');
  if (!hasIfu) {
    blockers.push({
      field: 'documents',
      message: 'An IFU must be attached. It is the document every lab buyer requests first.',
    });
  }

  if (!product.images?.length) {
    blockers.push({ field: 'images', message: 'At least one product image is required.' });
  }

  // — §12 SEO: no page ships without a title and description —
  if (!hasText(product.seo?.title)) {
    blockers.push({ field: 'seo.title', message: 'SEO title is required.' });
  }
  if (!hasText(product.seo?.description)) {
    blockers.push({ field: 'seo.description', message: 'SEO meta description is required.' });
  }

  return { publishable: blockers.length === 0, blockers };
}
