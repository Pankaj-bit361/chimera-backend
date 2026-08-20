import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { PUBLISH_STATUSES, seoSchema, toJSONTransform } from './common.js';

/**
 * Templated export landing pages (§7, §10 Phase 4) —
 * `/exports/{country}-diagnostic-kit-supplier`. Avecon runs six of these live;
 * each captures a distinct export search intent.
 */
const countryPageSchema = new Schema(
  {
    country: { type: String, required: true, trim: true },
    countryCode: { type: String, required: true, uppercase: true, trim: true, maxlength: 2 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    intro: { type: String, default: '' },
    focusProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    regulatoryNotes: { type: String, default: '' },
    /** Shipping/terms detail buyers ask for before they enquire. */
    logistics: {
      ports: { type: [String], default: [] },
      incoterms: { type: [String], default: ['FOB', 'CIF'] },
      leadTime: { type: String, default: '' },
    },
    seo: { type: seoSchema, default: () => ({}) },
    order: { type: Number, default: 0 },
    status: { type: String, enum: PUBLISH_STATUSES, default: 'draft', index: true },
  },
  { timestamps: true, toJSON: toJSONTransform, toObject: toJSONTransform },
);

export type CountryPageAttrs = InferSchemaType<typeof countryPageSchema>;
export type CountryPageDoc = HydratedDocument<CountryPageAttrs>;
export const CountryPage = model('CountryPage', countryPageSchema);
