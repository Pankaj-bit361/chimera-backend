import { Schema } from 'mongoose';

/** §12 — no page ships without a unique title + meta description. */
export type Seo = {
  title: string;
  description: string;
  ogImage?: string;
  noindex?: boolean;
};

export const seoSchema = new Schema<Seo>(
  {
    title: { type: String, trim: true, maxlength: 70, default: '' },
    description: { type: String, trim: true, maxlength: 180, default: '' },
    ogImage: { type: String, trim: true },
    noindex: { type: Boolean, default: false },
  },
  { _id: false },
);

export const PUBLISH_STATUSES = ['draft', 'published', 'archived'] as const;
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

/** Products additionally carry `roadmap` — announced in the site map, not yet sellable. */
export const PRODUCT_STATUSES = ['draft', 'published', 'roadmap', 'archived'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const SPEC_GROUPS = ['performance', 'handling', 'regulatory'] as const;
export type SpecGroup = (typeof SPEC_GROUPS)[number];

export const SPEC_GROUP_LABELS: Record<SpecGroup, string> = {
  performance: 'Performance',
  handling: 'Handling',
  regulatory: 'Regulatory',
};

export const LEAD_TYPES = ['quote', 'distributor', 'oem', 'document', 'contact', 'career'] as const;
export type LeadType = (typeof LEAD_TYPES)[number];

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost', 'spam'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** §9 8.2 — "the highest-value field on the site". */
export const LEAD_INTENTS = ['technical', 'brochure', 'price', 'sample', 'visit'] as const;
export type LeadIntent = (typeof LEAD_INTENTS)[number];

export const LEAD_INTENT_LABELS: Record<LeadIntent, string> = {
  technical: 'Technical details',
  brochure: 'Brochure',
  price: 'Price quotation',
  sample: 'Product sample',
  visit: 'Sales visit',
};

export const DOCUMENT_KINDS = ['ifu', 'coa', 'msds', 'catalogue', 'other'] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  ifu: 'Instructions for Use',
  coa: 'Certificate of Analysis',
  msds: 'Material Safety Data Sheet',
  catalogue: 'Product catalogue',
  other: 'Document',
};

export const USER_ROLES = ['owner', 'editor', 'sales'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Where a lead came from — kept for attribution, never shown to the buyer. */
export type LeadSource = {
  page?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  ip?: string;
  userAgent?: string;
};

export const leadSourceSchema = new Schema<LeadSource>(
  {
    page: String,
    referrer: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    ip: String,
    userAgent: String,
  },
  { _id: false },
);

/** Strips Mongo internals from every API response. */
export const toJSONTransform = {
  virtuals: true,
  versionKey: false,
  transform(_doc: unknown, ret: Record<string, unknown>) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.passwordHash;
    return ret;
  },
} as const;
