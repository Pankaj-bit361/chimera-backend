import { env } from '../../config/env.js';
import { mail } from '../../adapters/mail/index.js';
import { trackVolaneaEvent } from '../../adapters/mail/volanea-api.js';
import { logger } from '../../lib/logger.js';
import type { LeadDoc } from '../../models/Lead.js';
import {
  DOCUMENT_KIND_LABELS,
  LEAD_INTENT_LABELS,
  type DocumentKind,
  type LeadIntent,
  type LeadType,
} from '../../models/common.js';
import { addressesFor } from './routing.js';

/**
 * G1 — "every buyer enquiry reaches a human … 100% of form submissions produce
 * a routed notification."
 *
 * Two messages per lead: the internal routed notification, and the buyer's
 * acknowledgement. Both failures are recorded on the Lead so the dashboard can
 * show "notification failed" rather than silently repeating the old site's
 * defect in a new codebase.
 */

const TYPE_SUBJECTS: Record<LeadType, string> = {
  quote: 'Quote request',
  distributor: 'Distributor application',
  oem: 'OEM / private label enquiry',
  document: 'Document request',
  contact: 'Contact form',
  career: 'Career enquiry',
};

function row(label: string, value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  return `${label.padEnd(22)} ${String(value)}`;
}

function internalBody(lead: LeadDoc, extra: Array<string | null> = []): string {
  const lines = [
    row('Type', TYPE_SUBJECTS[lead.type as LeadType]),
    row('Received', lead.createdAt?.toISOString?.() ?? new Date().toISOString()),
    '',
    row('Name', lead.name),
    row('Company', lead.company),
    row('Email', lead.email),
    row('Phone', lead.phone),
    row('Country', lead.country),
    '',
    row('Interest', lead.interestLabel),
    row('Intent', lead.intent ? LEAD_INTENT_LABELS[lead.intent as LeadIntent] : ''),
    ...extra,
    '',
    lead.message ? `Message:\n${lead.message}` : null,
    '',
    row('Source page', lead.source?.page),
    row('Referrer', lead.source?.referrer),
    row('Campaign', lead.source?.utmCampaign),
  ];
  return lines.filter((line): line is string => line !== null).join('\n');
}

function dashboardLink(lead: LeadDoc): string {
  return `${env.web.dashboardUrl.replace(/\/$/, '')}/leads/${String(lead._id)}`;
}

function channelExtras(lead: LeadDoc): Array<string | null> {
  const details = lead.channelDetails;
  if (!details) return [];
  return [
    row('GSTIN', details.gstin),
    row('Drug licence no.', details.drugLicenceNo),
    row('Territory', details.territory),
    row('Existing portfolio', details.existingPortfolio),
    row('Annual volume', details.annualVolume),
    row('Years in business', details.yearsInBusiness),
    row('Customisation', details.customisationNeeds),
    row('Target market', details.targetMarket),
  ];
}

export async function notifyInternal(lead: LeadDoc): Promise<string[]> {
  const to = addressesFor(lead.type as LeadType, lead.country ?? undefined);
  const label = TYPE_SUBJECTS[lead.type as LeadType];
  const who = lead.company || lead.name;
  const details = internalBody(lead, channelExtras(lead));

  await mail.send({
    to,
    replyTo: lead.email,
    subject: `[${label}] ${who}${lead.interestLabel ? ` — ${lead.interestLabel}` : ''}`,
    text: `${details}\n\nOpen in dashboard: ${dashboardLink(lead)}`,
    template: {
      id: env.mail.volanea.templates.leadInternal,
      variables: { leadType: label, who, details, dashboardUrl: dashboardLink(lead) },
    },
    tag: `lead:${lead.type}`,
  });

  return to;
}

const ACK_INTRO: Record<LeadType, string> = {
  quote: 'Thank you for your enquiry. Our sales team will respond with a quotation.',
  distributor:
    'Thank you for your interest in distributing Chimera Biotech products. Our channel team reviews every application and will be in touch about territory availability.',
  oem: 'Thank you for your OEM / private-label enquiry. Our team will respond with capacity, customisation scope and regulatory support details.',
  document: 'Your document is ready to download.',
  contact: 'Thank you for contacting Chimera Biotech. We will respond shortly.',
  career: 'Thank you for your interest in working with Chimera Biotech.',
};

export async function acknowledgeBuyer(lead: LeadDoc, downloadUrl?: string): Promise<void> {
  const type = lead.type as LeadType;
  const kind = lead.documentRequest?.documentKind as DocumentKind | undefined;

  const lines = [
    `Dear ${lead.name},`,
    '',
    ACK_INTRO[type],
    '',
  ];

  if (downloadUrl) {
    lines.push(
      `${kind ? DOCUMENT_KIND_LABELS[kind] : 'Document'}: ${downloadUrl}`,
      '',
      `This link expires in ${env.documentLinkTtlMinutes} minutes. Request it again from the product page if it lapses.`,
      '',
    );
  }

  lines.push(
    'Regards,',
    'Chimera Biotech Pvt Ltd',
    `${env.mail.inboxes.info} · ${env.mail.domain}`,
  );

  const documentLabel = kind ? DOCUMENT_KIND_LABELS[kind] : 'document';
  const inbox = env.mail.inboxes.info;
  const { templates } = env.mail.volanea;

  // Buyer replies land in the general inbox, which also keeps a copy.
  await mail.send({
    to: lead.email,
    replyTo: inbox,
    cc: [inbox],
    subject: downloadUrl
      ? `Your ${documentLabel} from Chimera Biotech`
      : 'We have received your enquiry — Chimera Biotech',
    text: lines.join('\n'),
    template: downloadUrl
      ? {
          id: templates.document,
          variables: {
            name: lead.name,
            documentLabel,
            downloadUrl,
            ttlMinutes: String(env.documentLinkTtlMinutes),
            inbox,
          },
        }
      : { id: templates.ack, variables: { name: lead.name, intro: ACK_INTRO[type], inbox } },
    tag: `ack:${lead.type}`,
  });
}

/**
 * Sends both messages and records the outcome on the lead.
 * Never throws: a mail outage must not lose the lead itself.
 */
export async function dispatchLeadNotifications(
  lead: LeadDoc,
  downloadUrl?: string,
): Promise<void> {
  try {
    const routedTo = await notifyInternal(lead);
    await acknowledgeBuyer(lead, downloadUrl);
    lead.routedTo = routedTo;
    lead.notifiedAt = new Date();
    lead.notificationError = undefined;
  } catch (error) {
    lead.notificationError = String((error as Error)?.message ?? error);
    logger.error(`lead ${String(lead._id)} notification failed`, error);
  }
  await lead.save();

  // Lets Volanea workflows react, e.g. `lead.quote` → 3-day follow-up.
  await trackVolaneaEvent({
    name: `lead.${lead.type}`,
    email: lead.email,
    firstName: lead.name.split(/\s+/)[0],
    data: {
      company: lead.company ?? '',
      country: lead.country ?? '',
      interest: lead.interestLabel ?? '',
      interestSuffix: lead.interestLabel ? ` for ${lead.interestLabel}` : '',
    },
  });
}
