import { escapeRegex } from '../../lib/escapeRegex.js';
import type { Request } from 'express';
import { Category } from '../../models/Category.js';
import { Lead, type LeadDoc } from '../../models/Lead.js';
import { Product } from '../../models/Product.js';
import type { LeadSource, LeadType } from '../../models/common.js';
import { badRequest, created, notFound, ok, type Result } from '../../lib/http.js';
import {
  careerLeadInput,
  contactLeadInput,
  distributorLeadInput,
  leadNoteInput,
  leadQueryInput,
  leadUpdateInput,
  oemLeadInput,
  quoteLeadInput,
} from '../../validation/schemas.js';
import { dispatchLeadNotifications } from './notifications.js';
import { addressesFor } from './routing.js';

/**
 * The four funnels (§9 8.2) plus contact and careers.
 *
 * Every funnel lands in one Lead collection keyed by `type` (§7), and every
 * submission fires a routed notification (G1). Notification failure is recorded
 * on the lead, never swallowed — the entire premise of the rebuild is that a
 * lead must not be able to disappear.
 */

export function sourceFrom(req: Request, declared: Partial<LeadSource> = {}): LeadSource {
  return {
    page: declared.page,
    referrer: declared.referrer ?? req.get('referer') ?? undefined,
    utmSource: declared.utmSource,
    utmMedium: declared.utmMedium,
    utmCampaign: declared.utmCampaign,
    ip: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

/** Resolves whichever of product / category / free text the funnel supplied. */
async function resolveInterest(input: {
  product?: string;
  category?: string;
  interestLabel?: string;
}): Promise<{ productInterest?: string; categoryInterest?: string; interestLabel: string }> {
  if (input.product) {
    const product = await Product.findById(input.product).select('name category');
    if (product) {
      return {
        productInterest: String(product._id),
        categoryInterest: product.category ? String(product.category) : undefined,
        interestLabel: input.interestLabel || product.name,
      };
    }
  }
  if (input.category) {
    const category = await Category.findById(input.category).select('name');
    if (category) {
      return { categoryInterest: String(category._id), interestLabel: input.interestLabel || category.name };
    }
  }
  return { interestLabel: input.interestLabel ?? '' };
}

/** Silent accept for honeypot hits — a bot must not learn it was caught. */
function isSpam(input: { website?: string }): boolean {
  return Boolean(input.website && input.website.length > 0);
}

const acceptedResponse = (lead: LeadDoc) => ({
  id: String(lead._id),
  type: lead.type,
  message: 'Received. Our team will be in touch.',
});

export async function submitQuote(req: Request): Promise<Result<unknown>> {
  const input = quoteLeadInput.parse(req.body);
  if (isSpam(input)) return created({ id: null, type: 'quote', message: 'Received. Our team will be in touch.' });

  const interest = await resolveInterest(input);
  const lead = await Lead.create({
    type: 'quote',
    name: input.name,
    email: input.email,
    phone: input.phone,
    company: input.company,
    country: input.country,
    intent: input.intent,
    message: input.message,
    source: sourceFrom(req, input.source),
    ...interest,
  });

  await dispatchLeadNotifications(lead);
  return created(acceptedResponse(lead));
}

export async function submitDistributor(req: Request): Promise<Result<unknown>> {
  const input = distributorLeadInput.parse(req.body);
  if (isSpam(input)) return created({ id: null, type: 'distributor', message: 'Received. Our team will be in touch.' });

  const lead = await Lead.create({
    type: 'distributor',
    name: input.name,
    email: input.email,
    phone: input.phone,
    company: input.company,
    country: input.country ?? 'India',
    message: input.message,
    channelDetails: {
      gstin: input.gstin,
      drugLicenceNo: input.drugLicenceNo,
      territory: input.territory,
      existingPortfolio: input.existingPortfolio,
      annualVolume: input.annualVolume,
      yearsInBusiness: input.yearsInBusiness,
    },
    source: sourceFrom(req, input.source),
  });

  await dispatchLeadNotifications(lead);
  return created(acceptedResponse(lead));
}

export async function submitOem(req: Request): Promise<Result<unknown>> {
  const input = oemLeadInput.parse(req.body);
  if (isSpam(input)) return created({ id: null, type: 'oem', message: 'Received. Our team will be in touch.' });

  const interest = await resolveInterest(input);
  const lead = await Lead.create({
    type: 'oem',
    name: input.name,
    email: input.email,
    phone: input.phone,
    company: input.company,
    country: input.country,
    message: input.message,
    channelDetails: {
      annualVolume: input.annualVolume,
      customisationNeeds: input.customisationNeeds,
      targetMarket: input.targetMarket,
    },
    source: sourceFrom(req, input.source),
    ...interest,
  });

  await dispatchLeadNotifications(lead);
  return created(acceptedResponse(lead));
}

export async function submitContact(req: Request): Promise<Result<unknown>> {
  const input = contactLeadInput.parse(req.body);
  if (isSpam(input)) return created({ id: null, type: 'contact', message: 'Received. Our team will be in touch.' });

  const lead = await Lead.create({
    type: 'contact',
    name: input.name,
    email: input.email,
    phone: input.phone,
    company: input.company,
    country: input.country ?? 'India',
    message: input.message,
    source: sourceFrom(req, input.source),
  });

  await dispatchLeadNotifications(lead);
  return created(acceptedResponse(lead));
}

export async function submitCareer(req: Request): Promise<Result<unknown>> {
  const input = careerLeadInput.parse(req.body);
  if (isSpam(input)) return created({ id: null, type: 'career', message: 'Received. Our team will be in touch.' });

  const lead = await Lead.create({
    type: 'career',
    name: input.name,
    email: input.email,
    phone: input.phone,
    company: input.company,
    country: input.country ?? 'India',
    interestLabel: input.interestLabel,
    message: input.message,
    source: sourceFrom(req, input.source),
  });

  await dispatchLeadNotifications(lead);
  return created(acceptedResponse(lead));
}

// ─── Dashboard queue (§9 8.5) ────────────────────────────────────────────────

export async function listLeads(query: unknown): Promise<Result<unknown>> {
  const input = leadQueryInput.parse(query);
  const filter: Record<string, unknown> = {};

  if (input.type) filter.type = input.type;
  if (input.status) filter.status = input.status;
  if (input.assignedTo) filter.assignedTo = input.assignedTo;
  if (input.from || input.to) {
    filter.createdAt = {
      ...(input.from ? { $gte: new Date(input.from) } : {}),
      ...(input.to ? { $lte: new Date(input.to) } : {}),
    };
  }
  if (input.q) {
    const regex = { $regex: escapeRegex(input.q), $options: 'i' };
    filter.$or = [{ name: regex }, { email: regex }, { company: regex }, { interestLabel: regex }];
  }

  const [items, total] = await Promise.all([
    Lead.find(filter)
      .sort({ createdAt: -1 })
      .skip((input.page - 1) * input.limit)
      .limit(input.limit)
      .populate([
        { path: 'productInterest', select: 'name slug' },
        { path: 'assignedTo', select: 'name email' },
      ]),
    Lead.countDocuments(filter),
  ]);

  return ok({
    items: items.map((lead) => lead.toJSON()),
    page: input.page,
    limit: input.limit,
    total,
    pages: Math.ceil(total / input.limit),
  });
}

/** Queue counts for the sidebar badges. */
export async function leadStats(): Promise<Result<unknown>> {
  const [byType, byStatus, failed, last30] = await Promise.all([
    Lead.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
    Lead.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Lead.countDocuments({ notificationError: { $exists: true, $ne: null } }),
    Lead.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 86_400_000) } }),
  ]);

  return ok({
    byType: Object.fromEntries(byType.map((row) => [row._id, row.count])),
    byStatus: Object.fromEntries(byStatus.map((row) => [row._id, row.count])),
    /** Non-zero here means G1 is currently failing. It belongs on the dashboard. */
    notificationFailures: failed,
    last30Days: last30,
  });
}

export async function getLead(id: string): Promise<Result<unknown>> {
  const lead = await Lead.findById(id).populate([
    { path: 'productInterest', select: 'name slug' },
    { path: 'categoryInterest', select: 'name slug' },
    { path: 'assignedTo', select: 'name email' },
    { path: 'notes.author', select: 'name' },
    { path: 'documentRequest.media', select: 'originalName documentKind' },
  ]);
  if (!lead) return notFound('Lead not found');
  return ok({
    ...lead.toJSON(),
    wouldRouteTo: addressesFor(lead.type as LeadType, lead.country ?? undefined),
  });
}

export async function updateLead(id: string, body: unknown): Promise<Result<unknown>> {
  const input = leadUpdateInput.parse(body);
  const lead = await Lead.findById(id);
  if (!lead) return notFound('Lead not found');

  if (input.status) lead.status = input.status;
  if (input.assignedTo !== undefined) lead.assignedTo = (input.assignedTo ?? null) as never;
  await lead.save();

  return ok(lead.toJSON());
}

export async function addLeadNote(id: string, body: unknown, authorId: string): Promise<Result<unknown>> {
  const input = leadNoteInput.parse(body);
  const lead = await Lead.findById(id);
  if (!lead) return notFound('Lead not found');

  lead.notes.push({ body: input.body, author: authorId as never, createdAt: new Date() } as never);
  await lead.save();
  return ok(lead.toJSON());
}

/** Retry for a lead whose notification failed — closes the G1 gap by hand. */
export async function resendLeadNotification(id: string): Promise<Result<unknown>> {
  const lead = await Lead.findById(id);
  if (!lead) return notFound('Lead not found');
  await dispatchLeadNotifications(lead);
  if (lead.notificationError) return badRequest(`Still failing: ${lead.notificationError}`);
  return ok({ routedTo: lead.routedTo, notifiedAt: lead.notifiedAt });
}

const CSV_COLUMNS = [
  'createdAt',
  'type',
  'status',
  'name',
  'company',
  'email',
  'phone',
  'country',
  'interestLabel',
  'intent',
  'territory',
  'gstin',
  'drugLicenceNo',
  'annualVolume',
  'message',
  'routedTo',
] as const;

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  // Every value here came from a public form. A cell starting =, +, - or @ is
  // executed by Excel and Sheets on open, so an enquiry can run a formula on
  // the sales team's machine. Prefix with a quote to neutralise it.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function exportLeadsCsv(query: unknown): Promise<{ filename: string; csv: string }> {
  const input = leadQueryInput.parse(query);
  const filter: Record<string, unknown> = {};
  if (input.type) filter.type = input.type;
  if (input.status) filter.status = input.status;
  if (input.from || input.to) {
    filter.createdAt = {
      ...(input.from ? { $gte: new Date(input.from) } : {}),
      ...(input.to ? { $lte: new Date(input.to) } : {}),
    };
  }

  const leads = await Lead.find(filter).sort({ createdAt: -1 }).limit(5000);

  const rows = leads.map((lead) =>
    CSV_COLUMNS.map((column) => {
      switch (column) {
        case 'territory':
          return csvCell(lead.channelDetails?.territory);
        case 'gstin':
          return csvCell(lead.channelDetails?.gstin);
        case 'drugLicenceNo':
          return csvCell(lead.channelDetails?.drugLicenceNo);
        case 'annualVolume':
          return csvCell(lead.channelDetails?.annualVolume);
        case 'routedTo':
          return csvCell(lead.routedTo?.join(' | '));
        default:
          return csvCell(lead[column as keyof typeof lead]);
      }
    }).join(','),
  );

  const stamp = new Date().toISOString().slice(0, 10);
  return {
    filename: `chimera-leads-${input.type ?? 'all'}-${stamp}.csv`,
    csv: [CSV_COLUMNS.join(','), ...rows].join('\n'),
  };
}
