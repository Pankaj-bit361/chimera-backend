import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { PUBLISH_STATUSES, seoSchema, toJSONTransform } from './common.js';

/**
 * The taxonomy layer above products (§7) — the page that ranks for
 * "urine reagent strip manufacturer".
 *
 * `requiredSpecs` is the enforcement hook for §9 8.1: a product in this
 * category cannot be published until every listed spec slug is present,
 * non-empty and verified.
 */
const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    tagline: { type: String, trim: true, default: '' },
    description: { type: String, default: '' },
    hero: {
      media: { type: Schema.Types.ObjectId, ref: 'Media' },
      alt: { type: String, default: '' },
    },
    /** Copy shown above the product grid; the place category-level evidence goes. */
    intro: { type: String, default: '' },
    requiredSpecs: {
      type: [String],
      default: ['sensitivity', 'shelf-life', 'storage-temperature'],
    },
    seo: { type: seoSchema, default: () => ({}) },
    order: { type: Number, default: 0 },
    status: { type: String, enum: PUBLISH_STATUSES, default: 'draft', index: true },
  },
  { timestamps: true, toJSON: toJSONTransform, toObject: toJSONTransform },
);

categorySchema.index({ status: 1, order: 1 });

export type CategoryAttrs = InferSchemaType<typeof categorySchema>;
export type CategoryDoc = HydratedDocument<CategoryAttrs>;
export const Category = model('Category', categorySchema);
