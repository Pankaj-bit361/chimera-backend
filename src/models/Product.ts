import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { slugify } from '../lib/slug.js';
import {
  DOCUMENT_KINDS,
  PRODUCT_STATUSES,
  SPEC_GROUPS,
  seoSchema,
  toJSONTransform,
} from './common.js';

/**
 * One spec row (§7 — "specs as ordered rows, not fixed columns").
 *
 * - `slug` is machine-derived from the label so publish rules can be enforced
 *   in the API rather than left to editor discipline (§9 8.1).
 * - `key` drives the 3px phenol left-rule in the Readout. §6.7 rule 02 caps it
 *   at a handful of rows; the API refuses more than 4 per product.
 * - `verified` gates publication. A number nobody has checked cannot go live
 *   (§12, Compliance).
 */
const specSchema = new Schema(
  {
    slug: { type: String, required: true, trim: true, lowercase: true },
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    unit: { type: String, trim: true, default: '' },
    group: { type: String, enum: SPEC_GROUPS, default: 'performance' },
    order: { type: Number, default: 0 },
    key: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    /** Free-text provenance, e.g. "Internal validation report VR-2024-11". */
    evidence: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const packSizeSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    tests: { type: Number, min: 1 },
    sku: { type: String, required: true, trim: true, uppercase: true },
    hsn: { type: String, trim: true, default: '' },
    moq: { type: Number, min: 1, default: 1 },
    /** Only rendered when PRICING_MODE=indicative (D5 — see DECISIONS.md). */
    indicativePrice: { type: Number, min: 0 },
    currency: { type: String, default: 'INR' },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

const productDocumentSchema = new Schema(
  {
    kind: { type: String, enum: DOCUMENT_KINDS, required: true },
    label: { type: String, trim: true, default: '' },
    media: { type: Schema.Types.ObjectId, ref: 'Media', required: true },
  },
  { _id: false },
);

/**
 * Regulatory claims. Every field is a *number or a reference*, never a boolean
 * badge on its own — §6.7 rule 01 ("no adjective survives where a number
 * exists") and §8.4 ("text-only claims are not acceptable").
 */
const regulatorySchema = new Schema(
  {
    cdscoLicenceNo: { type: String, trim: true, default: '' },
    icmrRegistrationNo: { type: String, trim: true, default: '' },
    iso13485: { type: String, trim: true, default: '' },
    iso9001: { type: String, trim: true, default: '' },
    ceMark: { type: String, trim: true, default: '' },
    gmp: { type: String, trim: true, default: '' },
    /** Certification records backing the above. Populated on the product page. */
    certifications: [{ type: Schema.Types.ObjectId, ref: 'Certification' }],
    notes: { type: String, default: '' },
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },

    /** The failure the audit found: a description that never states what it detects. */
    shortDescription: { type: String, required: true, trim: true, maxlength: 320 },
    intendedUse: { type: String, default: '' },

    analytes: { type: [String], default: [] },
    sampleTypes: { type: [String], default: [] },
    method: { type: String, trim: true, default: '' },
    format: { type: String, trim: true, default: '' },

    specs: { type: [specSchema], default: [] },
    packSizes: { type: [packSizeSchema], default: [] },
    regulatory: { type: regulatorySchema, default: () => ({}) },

    images: [{ type: Schema.Types.ObjectId, ref: 'Media' }],
    documents: { type: [productDocumentSchema], default: [] },
    relatedProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],

    seo: { type: seoSchema, default: () => ({}) },
    status: { type: String, enum: PRODUCT_STATUSES, default: 'draft', index: true },
    featured: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    publishedAt: { type: Date },
  },
  { timestamps: true, toJSON: toJSONTransform, toObject: toJSONTransform },
);

productSchema.index({ status: 1, category: 1, order: 1 });
productSchema.index({ name: 'text', shortDescription: 'text', analytes: 'text' });

/** Spec slugs are derived, never hand-typed, so publish rules can match on them. */
productSchema.pre('validate', function normaliseSpecSlugs(next) {
  const doc = this as unknown as { specs?: Array<{ slug?: string; label: string; order?: number }> };
  doc.specs?.forEach((spec, index) => {
    if (!spec.slug && spec.label) spec.slug = slugify(spec.label);
    if (spec.order === undefined || spec.order === null) spec.order = index;
  });
  next();
});

export type SpecRow = InferSchemaType<typeof specSchema>;
export type PackSize = InferSchemaType<typeof packSizeSchema>;
export type ProductAttrs = InferSchemaType<typeof productSchema>;
export type ProductDoc = HydratedDocument<ProductAttrs>;
export const Product = model('Product', productSchema);
