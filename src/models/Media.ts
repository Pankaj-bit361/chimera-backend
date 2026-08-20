import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { DOCUMENT_KINDS, toJSONTransform } from './common.js';

/**
 * Images and files (§7).
 *
 * `gated` is the switch behind §9 8.2's highest-value missing feature: a gated
 * file is never given a public URL, only a signed expiring link minted after a
 * download lead is recorded.
 *
 * `alt` is required on images — §12 lists alt text as enforced on upload, not
 * requested politely afterwards.
 */
const mediaSchema = new Schema(
  {
    kind: { type: String, enum: ['image', 'document'], required: true, index: true },
    documentKind: { type: String, enum: DOCUMENT_KINDS },
    storageKey: { type: String, required: true, unique: true },
    originalName: { type: String, default: '' },
    mime: { type: String, required: true },
    size: { type: Number, required: true },
    alt: { type: String, default: '' },
    width: Number,
    height: Number,
    gated: { type: Boolean, default: false, index: true },
    downloadCount: { type: Number, default: 0 },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: toJSONTransform, toObject: toJSONTransform },
);

mediaSchema.pre('validate', function requireAltOnImages(next) {
  const doc = this as unknown as { kind: string; alt?: string };
  if (doc.kind === 'image' && !doc.alt?.trim()) {
    next(new Error('Alt text is required on images (WCAG 2.1 AA — see §12)'));
    return;
  }
  next();
});

export type MediaAttrs = InferSchemaType<typeof mediaSchema>;
export type MediaDoc = HydratedDocument<MediaAttrs>;
export const Media = model('Media', mediaSchema);
