import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { PUBLISH_STATUSES, seoSchema, toJSONTransform } from './common.js';

/**
 * Blog (§7). `relatedProducts` is not decoration — §10 Phase 4 requires every
 * post to end in a product link, because the three existing 2022 posts discuss
 * PCR, RDT and NS1 and link to nothing.
 */
const postSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    excerpt: { type: String, trim: true, maxlength: 320, default: '' },
    /** Markdown. Rendered server-side in Next.js. */
    body: { type: String, default: '' },
    cover: { type: Schema.Types.ObjectId, ref: 'Media' },
    relatedProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    tags: { type: [String], default: [] },
    author: { type: String, trim: true, default: 'Chimera Biotech' },
    readingMinutes: { type: Number, default: 0 },
    seo: { type: seoSchema, default: () => ({}) },
    status: { type: String, enum: PUBLISH_STATUSES, default: 'draft', index: true },
    publishedAt: { type: Date, index: true },
  },
  { timestamps: true, toJSON: toJSONTransform, toObject: toJSONTransform },
);

postSchema.index({ status: 1, publishedAt: -1 });

postSchema.pre('validate', function deriveReadingTime(next) {
  const doc = this as unknown as { body?: string; readingMinutes?: number };
  if (doc.body) {
    const words = doc.body.trim().split(/\s+/).length;
    doc.readingMinutes = Math.max(1, Math.round(words / 220));
  }
  next();
});

export type PostAttrs = InferSchemaType<typeof postSchema>;
export type PostDoc = HydratedDocument<PostAttrs>;
export const Post = model('Post', postSchema);
