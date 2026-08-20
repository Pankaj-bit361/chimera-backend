import type { Request, Response } from 'express';
import { env } from '../../config/env.js';
import { storage } from '../../adapters/storage/index.js';
import { badRequest, created, notFound, ok, type Result } from '../../lib/http.js';
import { createDocumentToken, documentDownloadUrl, verifyDocumentToken } from '../../lib/signedLinks.js';
import { Lead } from '../../models/Lead.js';
import { Media } from '../../models/Media.js';
import { Product } from '../../models/Product.js';
import { documentRequestInput } from '../../validation/schemas.js';
import { dispatchLeadNotifications } from '../leads/notifications.js';
import { sourceFrom } from '../leads/leads.functions.js';

/**
 * Gated documents — "the single highest-value missing feature" (§9 8.2).
 *
 * The trade: the buyer gets the IFU/COA/MSDS they need before raising a PO,
 * Chimera gets a qualified contact with name, company and phone attached.
 *
 * Flow: request → Lead created → signed expiring link emailed → redemption
 * recorded. The file is never reachable without passing through the lead.
 */

export async function requestDocument(req: Request): Promise<Result<unknown>> {
  const input = documentRequestInput.parse(req.body);
  if (input.website) return created({ message: 'Received.' });

  const media = await Media.findById(input.media);
  if (!media) return notFound('That document is not available');
  if (media.kind !== 'document') return badRequest('That file is not a document');

  const product = input.product ? await Product.findById(input.product).select('name category') : null;

  const lead = await Lead.create({
    type: 'document',
    name: input.name,
    email: input.email,
    phone: input.phone,
    company: input.company,
    country: input.country ?? 'India',
    message: input.message,
    productInterest: product?._id,
    categoryInterest: product?.category,
    interestLabel: product?.name ?? media.originalName,
    documentRequest: {
      documentKind: media.documentKind,
      media: media._id,
      product: product?._id,
    },
    source: sourceFrom(req, input.source),
  });

  // Ungated files still record the lead — the download is simply immediate.
  const { token, expiresAt } = createDocumentToken({
    mediaId: String(media._id),
    leadId: String(lead._id),
  });
  const url = documentDownloadUrl(token, apiBaseUrl(req));

  lead.documentRequest!.linkSentAt = new Date();
  lead.documentRequest!.linkExpiresAt = expiresAt;
  await lead.save();

  await dispatchLeadNotifications(lead, url);

  return created({
    id: String(lead._id),
    /**
     * Returned so the browser can start the download immediately after the
     * modal closes. The same link is emailed, which is what makes it shareable
     * with a colleague and what turns the request into a durable contact.
     */
    downloadUrl: url,
    expiresAt,
    message: 'Your download link is on its way by email.',
  });
}

/**
 * The link we email is built from configuration, never from the request.
 * `Host` and `X-Forwarded-Proto` are both client-controlled, so deriving the
 * URL from them turned this endpoint into an unauthenticated phishing relay:
 * an attacker could have Chimera send a link on their own domain, from
 * Chimera's address, to any recipient they named.
 */
function apiBaseUrl(_req: Request): string {
  return env.apiBaseUrl.replace(/\/$/, '');
}

/**
 * Redeems a signed link. Never trusts anything but the signature.
 * Streams (local) or redirects to a short-lived presigned URL (S3).
 */
export async function downloadDocument(token: string, res: Response): Promise<void> {
  const verified = verifyDocumentToken(token);

  if (!verified.ok) {
    const message =
      verified.reason === 'expired'
        ? 'This download link has expired. Request the document again from the product page.'
        : 'This download link is not valid.';
    res.status(verified.reason === 'expired' ? 410 : 400).json({ error: message, code: verified.reason });
    return;
  }

  const media = await Media.findById(verified.claims.mediaId);
  if (!media) {
    res.status(404).json({ error: 'Document not found', code: 'not_found' });
    return;
  }

  await Promise.all([
    Media.updateOne({ _id: media._id }, { $inc: { downloadCount: 1 } }),
    Lead.updateOne(
      { _id: verified.claims.leadId },
      {
        $set: { 'documentRequest.downloadedAt': new Date() },
        $inc: { 'documentRequest.downloadCount': 1 },
      },
    ),
  ]);

  const resolved = await storage.resolveGated(media.storageKey);

  if (resolved.kind === 'redirect') {
    res.redirect(302, resolved.url);
    return;
  }

  res.setHeader('Content-Type', media.mime);
  res.setHeader('Content-Length', String(resolved.size));
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${(media.originalName || 'document.pdf').replace(/"/g, '')}"`,
  );
  res.setHeader('Cache-Control', 'no-store');
  resolved.stream.pipe(res);
}

/** The public `/downloads` index — what exists, never where it lives. */
export async function listPublicDocuments(): Promise<Result<unknown>> {
  const documents = await Media.find({ kind: 'document' }).sort({ documentKind: 1, originalName: 1 });

  const products = await Product.find({ status: 'published' })
    .select('name slug documents category')
    .populate({ path: 'category', select: 'slug' });

  const productByMedia = new Map<string, { name: string; slug: string; categorySlug?: string }>();
  for (const product of products) {
    for (const doc of product.documents ?? []) {
      productByMedia.set(String(doc.media), {
        name: product.name,
        slug: product.slug,
        categorySlug: (product.category as unknown as { slug?: string } | null)?.slug,
      });
    }
  }

  return ok({
    items: documents
      .filter((media) => productByMedia.has(String(media._id)) || media.documentKind === 'catalogue')
      .map((media) => ({
        id: String(media._id),
        kind: media.documentKind ?? 'other',
        name: media.originalName,
        sizeBytes: media.size,
        gated: media.gated,
        url: media.gated ? null : storage.publicUrl(media.storageKey),
        product: productByMedia.get(String(media._id)) ?? null,
      })),
    ttlMinutes: env.documentLinkTtlMinutes,
  });
}
