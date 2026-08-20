import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import {
  DOCUMENT_KINDS,
  LEAD_INTENTS,
  LEAD_STATUSES,
  LEAD_TYPES,
  leadSourceSchema,
  toJSONTransform,
} from './common.js';

/**
 * One Lead collection, not six (§7).
 *
 * Sales works a single queue, and the same company requests a document in March
 * and applies as a distributor in June. `type` drives routing, notification
 * inbox and dashboard queue; `email` keeps those rows joinable.
 */

/** Distributor + OEM specifics. Sparse by design — one funnel fills each half. */
const channelDetailsSchema = new Schema(
  {
    gstin: { type: String, trim: true, uppercase: true },
    drugLicenceNo: { type: String, trim: true },
    territory: { type: String, trim: true },
    existingPortfolio: { type: String },
    annualVolume: { type: String, trim: true },
    yearsInBusiness: { type: Number, min: 0 },
    customisationNeeds: { type: String },
    targetMarket: { type: String, trim: true },
  },
  { _id: false },
);

const documentRequestSchema = new Schema(
  {
    documentKind: { type: String, enum: DOCUMENT_KINDS },
    media: { type: Schema.Types.ObjectId, ref: 'Media' },
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    linkSentAt: Date,
    linkExpiresAt: Date,
    downloadedAt: Date,
    downloadCount: { type: Number, default: 0 },
  },
  { _id: false },
);

const noteSchema = new Schema(
  {
    body: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const leadSchema = new Schema(
  {
    type: { type: String, enum: LEAD_TYPES, required: true, index: true },
    status: { type: String, enum: LEAD_STATUSES, default: 'new', index: true },

    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    phone: { type: String, trim: true, default: '' },
    company: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: 'India', index: true },

    productInterest: { type: Schema.Types.ObjectId, ref: 'Product' },
    categoryInterest: { type: Schema.Types.ObjectId, ref: 'Category' },
    /** Kept as text too: a buyer may name something not in the catalogue yet. */
    interestLabel: { type: String, trim: true, default: '' },

    intent: { type: String, enum: LEAD_INTENTS },
    message: { type: String, default: '' },

    channelDetails: { type: channelDetailsSchema, default: undefined },
    documentRequest: { type: documentRequestSchema, default: undefined },
    source: { type: leadSourceSchema, default: () => ({}) },

    /** Which inbox actually received it — auditable answer to "did this route?" */
    routedTo: { type: [String], default: [] },
    notifiedAt: Date,
    notificationError: String,

    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    notes: { type: [noteSchema], default: [] },
  },
  { timestamps: true, toJSON: toJSONTransform, toObject: toJSONTransform },
);

leadSchema.index({ createdAt: -1 });
leadSchema.index({ type: 1, status: 1, createdAt: -1 });

export type LeadAttrs = InferSchemaType<typeof leadSchema>;
export type LeadDoc = HydratedDocument<LeadAttrs>;
export const Lead = model('Lead', leadSchema);
