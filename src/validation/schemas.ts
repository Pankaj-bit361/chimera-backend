import { z } from 'zod';
import {
  DOCUMENT_KINDS,
  LEAD_INTENTS,
  LEAD_STATUSES,
  LEAD_TYPES,
  PRODUCT_STATUSES,
  PUBLISH_STATUSES,
  SPEC_GROUPS,
  USER_ROLES,
} from '../models/common.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const optionalObjectId = objectId.optional().or(z.literal('')).transform((v) => (v ? v : undefined));

const trimmed = (max: number) => z.string().trim().max(max);
const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase words separated by hyphens');

export const seoInput = z.object({
  title: trimmed(70).optional(),
  description: trimmed(180).optional(),
  ogImage: z.string().trim().optional(),
  noindex: z.boolean().optional(),
});

// ─── Auth ────────────────────────────────────────────────────────────────────

export const loginInput = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const changePasswordInput = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10, 'Use at least 10 characters'),
});

export const userInput = z.object({
  name: trimmed(120).min(1),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(10).optional(),
  role: z.enum(USER_ROLES),
  active: z.boolean().optional(),
});

// ─── Catalogue ───────────────────────────────────────────────────────────────

export const categoryInput = z.object({
  name: trimmed(120).min(1),
  slug: slug.optional(),
  tagline: trimmed(200).optional(),
  description: z.string().optional(),
  intro: z.string().optional(),
  hero: z
    .object({ media: optionalObjectId, alt: trimmed(200).optional() })
    .optional(),
  requiredSpecs: z.array(slug).optional(),
  seo: seoInput.optional(),
  order: z.number().int().optional(),
  status: z.enum(PUBLISH_STATUSES).optional(),
});

export const specRowInput = z.object({
  slug: slug.optional(),
  label: trimmed(80).min(1),
  value: trimmed(200).min(1),
  unit: trimmed(24).optional(),
  group: z.enum(SPEC_GROUPS).optional(),
  order: z.number().int().optional(),
  key: z.boolean().optional(),
  verified: z.boolean().optional(),
  evidence: trimmed(200).optional(),
});

export const packSizeInput = z.object({
  label: trimmed(80).min(1),
  tests: z.number().int().min(1).optional(),
  sku: trimmed(40).min(1),
  hsn: trimmed(20).optional(),
  moq: z.number().int().min(1).optional(),
  indicativePrice: z.number().min(0).optional(),
  currency: trimmed(3).optional(),
  order: z.number().int().optional(),
});

export const productInput = z.object({
  name: trimmed(160).min(1),
  slug: slug.optional(),
  category: objectId,
  shortDescription: trimmed(320).min(1),
  intendedUse: z.string().optional(),
  analytes: z.array(trimmed(80)).optional(),
  sampleTypes: z.array(trimmed(80)).optional(),
  method: trimmed(120).optional(),
  format: trimmed(120).optional(),
  specs: z.array(specRowInput).optional(),
  packSizes: z.array(packSizeInput).optional(),
  regulatory: z
    .object({
      cdscoLicenceNo: trimmed(80).optional(),
      icmrRegistrationNo: trimmed(80).optional(),
      iso13485: trimmed(80).optional(),
      iso9001: trimmed(80).optional(),
      ceMark: trimmed(80).optional(),
      gmp: trimmed(80).optional(),
      certifications: z.array(objectId).optional(),
      notes: z.string().optional(),
    })
    .optional(),
  images: z.array(objectId).optional(),
  documents: z
    .array(
      z.object({
        kind: z.enum(DOCUMENT_KINDS),
        label: trimmed(80).optional(),
        media: objectId,
      }),
    )
    .optional(),
  relatedProducts: z.array(objectId).optional(),
  seo: seoInput.optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  featured: z.boolean().optional(),
  order: z.number().int().optional(),
});

// ─── Leads — the four funnels (§9 8.2) ───────────────────────────────────────

const leadSourceInput = z
  .object({
    page: trimmed(300).optional(),
    referrer: trimmed(300).optional(),
    utmSource: trimmed(80).optional(),
    utmMedium: trimmed(80).optional(),
    utmCampaign: trimmed(80).optional(),
  })
  .optional();

const contactBase = {
  name: trimmed(120).min(1, 'Name is required'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  phone: trimmed(40).optional(),
  company: trimmed(160).optional(),
  country: trimmed(80).optional(),
  message: trimmed(4000).optional(),
  source: leadSourceInput,
  /** Honeypot — a real browser never fills this. */
  // Honeypot. Deliberately permissive: rejecting here returns a 422 that names
  // the hidden field, which tells the bot exactly what to leave blank next
  // time. The lead modules read it and silently accept instead — see isSpam().
  website: z.string().optional(),
};

export const quoteLeadInput = z.object({
  ...contactBase,
  company: trimmed(160).min(1, 'Company is required'),
  phone: trimmed(40).min(6, 'Phone is required'),
  country: trimmed(80).min(1, 'Country is required'),
  product: optionalObjectId,
  category: optionalObjectId,
  interestLabel: trimmed(160).optional(),
  intent: z.enum(LEAD_INTENTS, {
    errorMap: () => ({ message: 'Tell us what you need — it decides who calls you back' }),
  }),
});

export const distributorLeadInput = z.object({
  ...contactBase,
  company: trimmed(160).min(1, 'Company is required'),
  phone: trimmed(40).min(6, 'Phone is required'),
  gstin: trimmed(20).optional(),
  drugLicenceNo: trimmed(60).optional(),
  territory: trimmed(160).min(1, 'Territory is required'),
  existingPortfolio: trimmed(1000).optional(),
  annualVolume: trimmed(80).optional(),
  yearsInBusiness: z.number().int().min(0).max(120).optional(),
});

export const oemLeadInput = z.object({
  ...contactBase,
  company: trimmed(160).min(1, 'Company is required'),
  country: trimmed(80).min(1, 'Country is required'),
  interestLabel: trimmed(160).optional(),
  product: optionalObjectId,
  annualVolume: trimmed(80).optional(),
  customisationNeeds: trimmed(1000).optional(),
  targetMarket: trimmed(160).optional(),
});

export const contactLeadInput = z.object({
  ...contactBase,
  message: trimmed(4000).min(1, 'Message is required'),
});

export const careerLeadInput = z.object({
  ...contactBase,
  interestLabel: trimmed(160).optional(),
  message: trimmed(4000).min(1, 'Tell us about the role you are interested in'),
});

/** The gate in front of every IFU / COA / MSDS (§9 8.2). */
export const documentRequestInput = z.object({
  ...contactBase,
  company: trimmed(160).min(1, 'Organization is required'),
  phone: trimmed(40).min(6, 'Phone is required'),
  media: objectId,
  product: optionalObjectId,
});

// ─── Lead administration ─────────────────────────────────────────────────────

export const leadUpdateInput = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  assignedTo: optionalObjectId,
});

export const leadNoteInput = z.object({
  body: trimmed(2000).min(1),
});

export const leadQueryInput = z.object({
  type: z.enum(LEAD_TYPES).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  assignedTo: optionalObjectId,
  q: trimmed(120).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

// ─── Content ─────────────────────────────────────────────────────────────────

export const pageInput = z.object({
  key: slug,
  title: trimmed(160).min(1),
  intro: z.string().optional(),
  blocks: z
    .array(z.object({ type: z.string(), data: z.record(z.unknown()).optional() }))
    .optional(),
  seo: seoInput.optional(),
  status: z.enum(PUBLISH_STATUSES).optional(),
});

export const postInput = z.object({
  title: trimmed(200).min(1),
  slug: slug.optional(),
  excerpt: trimmed(320).optional(),
  body: z.string().optional(),
  cover: optionalObjectId,
  relatedProducts: z.array(objectId).optional(),
  tags: z.array(trimmed(40)).optional(),
  author: trimmed(120).optional(),
  seo: seoInput.optional(),
  status: z.enum(PUBLISH_STATUSES).optional(),
  publishedAt: z.string().datetime().optional(),
});

export const certificationInput = z.object({
  name: trimmed(160).min(1),
  issuer: trimmed(160).min(1),
  number: trimmed(80).optional(),
  issuedOn: z.string().datetime().optional(),
  validTill: z.string().datetime().optional(),
  scope: z.string().optional(),
  certificateFile: optionalObjectId,
  order: z.number().int().optional(),
  status: z.enum(PUBLISH_STATUSES).optional(),
});

export const countryPageInput = z.object({
  country: trimmed(80).min(1),
  countryCode: z.string().trim().length(2),
  slug: slug.optional(),
  intro: z.string().optional(),
  focusProducts: z.array(objectId).optional(),
  regulatoryNotes: z.string().optional(),
  logistics: z
    .object({
      ports: z.array(trimmed(80)).optional(),
      incoterms: z.array(trimmed(20)).optional(),
      leadTime: trimmed(80).optional(),
    })
    .optional(),
  seo: seoInput.optional(),
  order: z.number().int().optional(),
  status: z.enum(PUBLISH_STATUSES).optional(),
});

export const mediaUpdateInput = z.object({
  alt: trimmed(200).optional(),
  gated: z.boolean().optional(),
  documentKind: z.enum(DOCUMENT_KINDS).optional(),
});

export const settingInput = z.object({
  value: z.unknown(),
});

export type QuoteLeadInput = z.infer<typeof quoteLeadInput>;
export type DistributorLeadInput = z.infer<typeof distributorLeadInput>;
export type OemLeadInput = z.infer<typeof oemLeadInput>;
export type DocumentRequestInput = z.infer<typeof documentRequestInput>;
export type ContactLeadInput = z.infer<typeof contactLeadInput>;
export type CareerLeadInput = z.infer<typeof careerLeadInput>;
export type ProductInput = z.infer<typeof productInput>;
export type CategoryInput = z.infer<typeof categoryInput>;
export type LeadQueryInput = z.infer<typeof leadQueryInput>;
