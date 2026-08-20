import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { PUBLISH_STATUSES, seoSchema, toJSONTransform } from './common.js';

/**
 * Editable content pages (§7) — About, Manufacturing & Quality, OEM,
 * Distributor, Careers, FAQ, and the four legal pages.
 *
 * `key` is a stable identifier the Next.js route reads; slugs are owned by the
 * site map, not by editors, so a rename can never 404 a live URL.
 */
const blockSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        'hero',
        'prose',
        'stats',
        'figure',
        'gallery',
        'faq',
        'timeline',
        'callout',
        'cta',
        'certifications',
        'contact',
        'form',
      ],
    },
    /** Block payload — shape varies by type, validated in the block validators. */
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const pageSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    /** Rendered under the H1 as the lede. */
    intro: { type: String, default: '' },
    blocks: { type: [blockSchema], default: [] },
    seo: { type: seoSchema, default: () => ({}) },
    status: { type: String, enum: PUBLISH_STATUSES, default: 'draft', index: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: toJSONTransform, toObject: toJSONTransform },
);

export type PageAttrs = InferSchemaType<typeof pageSchema>;
export type PageDoc = HydratedDocument<PageAttrs>;
export const Page = model('Page', pageSchema);
