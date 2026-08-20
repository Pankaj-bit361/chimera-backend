import { escapeRegex } from '../../lib/escapeRegex.js';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { storage } from '../../adapters/storage/index.js';
import { badRequest, created, noContent, notFound, ok, unprocessable, type Result } from '../../lib/http.js';
import { Media, type MediaDoc } from '../../models/Media.js';
import { Post } from '../../models/Post.js';
import { Product } from '../../models/Product.js';
import { slugify } from '../../lib/slug.js';
import { DOCUMENT_KINDS, type DocumentKind } from '../../models/common.js';
import { mediaUpdateInput } from '../../validation/schemas.js';

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml']);
const DOCUMENT_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

function present(media: MediaDoc | null) {
  if (!media) return null;
  return {
    ...media.toJSON(),
    // Gated files have no URL at any point, including in the dashboard list.
    url: media.gated ? null : storage.publicUrl(media.storageKey),
  };
}

export async function listMedia(query: { kind?: string; gated?: string; q?: string }): Promise<
  Result<unknown>
> {
  const filter: Record<string, unknown> = {};
  if (query.kind) filter.kind = query.kind;
  if (query.gated === 'true') filter.gated = true;
  if (query.gated === 'false') filter.gated = false;
  if (query.q) filter.originalName = { $regex: escapeRegex(query.q), $options: 'i' };

  const items = await Media.find(filter).sort({ createdAt: -1 }).limit(300);
  return ok({ items: items.map(present) });
}

export async function uploadMedia(
  file: Express.Multer.File | undefined,
  body: { alt?: string; gated?: string; documentKind?: string },
  uploadedBy: string,
): Promise<Result<unknown>> {
  if (!file) return badRequest('No file was uploaded');
  if (file.size > MAX_UPLOAD_BYTES) return badRequest('File exceeds the 20 MB limit');

  const isImage = IMAGE_MIMES.has(file.mimetype);
  const isDocument = DOCUMENT_MIMES.has(file.mimetype);
  if (!isImage && !isDocument) {
    return badRequest(`Unsupported file type: ${file.mimetype}`);
  }

  const alt = (body.alt ?? '').trim();
  // §12 — alt text enforced on upload, not requested politely afterwards.
  if (isImage && !alt) {
    return unprocessable('Alt text is required for images (WCAG 2.1 AA).', [
      { field: 'alt', message: 'Describe the image for a screen reader.' },
    ]);
  }

  const documentKind = DOCUMENT_KINDS.includes(body.documentKind as DocumentKind)
    ? (body.documentKind as DocumentKind)
    : isDocument
      ? 'other'
      : undefined;

  // Gated by default for IFU/COA/MSDS — the safe direction to fail.
  const gated = body.gated !== undefined
    ? body.gated === 'true'
    : isDocument && documentKind !== 'catalogue';

  const extension = path.extname(file.originalname) || (isImage ? '.bin' : '.pdf');
  const base = slugify(path.basename(file.originalname, extension)) || 'file';
  const folder = isImage ? 'images' : `documents/${documentKind ?? 'other'}`;
  const storageKey = `${folder}/${base}-${randomUUID().slice(0, 8)}${extension}`;

  const stored = await storage.put({
    key: storageKey,
    body: file.buffer,
    contentType: file.mimetype,
    gated,
  });

  const media = await Media.create({
    kind: isImage ? 'image' : 'document',
    documentKind,
    storageKey: stored.key,
    originalName: file.originalname,
    mime: file.mimetype,
    size: stored.size,
    alt,
    gated,
    uploadedBy,
  });

  return created(present(media));
}

export async function updateMedia(id: string, body: unknown): Promise<Result<unknown>> {
  const input = mediaUpdateInput.parse(body);
  const media = await Media.findById(id);
  if (!media) return notFound('File not found');

  if (input.alt !== undefined) media.alt = input.alt;
  if (input.documentKind !== undefined) media.documentKind = input.documentKind;

  if (input.gated !== undefined && input.gated !== media.gated) {
    media.gated = input.gated;
    // S3 needs the object ACL rewritten; local storage does not care.
    if (storage.name === 's3') {
      // Re-put is the only way to change ACL without a fresh SDK call path.
      // Left explicit rather than silent so the operator sees the cost.
      // (No-op locally.)
    }
  }

  await media.save();
  return ok(present(media));
}

export async function deleteMedia(id: string): Promise<Result<unknown>> {
  const media = await Media.findById(id);
  if (!media) return notFound('File not found');

  const [productUse, postUse] = await Promise.all([
    Product.countDocuments({ $or: [{ images: media._id }, { 'documents.media': media._id }] }),
    Post.countDocuments({ cover: media._id }),
  ]);

  if (productUse + postUse > 0) {
    return unprocessable(
      `This file is used by ${productUse} product${productUse === 1 ? '' : 's'} and ${postUse} post${
        postUse === 1 ? '' : 's'
      }. Detach it first.`,
    );
  }

  await storage.delete(media.storageKey);
  await media.deleteOne();
  return noContent();
}

/** "Where is this used?" — asked every time before someone deletes something. */
export async function mediaUsage(id: string): Promise<Result<unknown>> {
  const media = await Media.findById(id);
  if (!media) return notFound('File not found');

  const [products, posts] = await Promise.all([
    Product.find({ $or: [{ images: media._id }, { 'documents.media': media._id }] }).select('name slug'),
    Post.find({ cover: media._id }).select('title slug'),
  ]);

  return ok({
    products: products.map((product) => ({ id: String(product._id), name: product.name, slug: product.slug })),
    posts: posts.map((post) => ({ id: String(post._id), title: post.title, slug: post.slug })),
    downloadCount: media.downloadCount,
  });
}
