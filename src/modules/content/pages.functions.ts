import { created, noContent, notFound, ok, unprocessable, type Result } from '../../lib/http.js';
import { pagePaths, revalidate } from '../../lib/revalidate.js';
import { Page } from '../../models/Page.js';
import { pageInput } from '../../validation/schemas.js';

export async function getPublicPage(key: string): Promise<Result<unknown>> {
  const page = await Page.findOne({ key, status: 'published' });
  if (!page) return notFound('Page not found');
  return ok(page.toJSON());
}

export async function listPublicPages(): Promise<Result<unknown>> {
  const pages = await Page.find({ status: 'published' }).select('key title seo updatedAt');
  return ok({ items: pages.map((page) => page.toJSON()) });
}

export async function listPages(): Promise<Result<unknown>> {
  const pages = await Page.find().sort({ key: 1 }).select('key title status updatedAt');
  return ok({ items: pages.map((page) => page.toJSON()) });
}

export async function getPage(id: string): Promise<Result<unknown>> {
  const page = await Page.findById(id);
  if (!page) return notFound('Page not found');
  return ok(page.toJSON());
}

export async function createPage(body: unknown, userId: string): Promise<Result<unknown>> {
  const input = pageInput.parse(body);
  const page = await Page.create({ ...input, updatedBy: userId });
  await revalidate(pagePaths(page.key));
  return created(page.toJSON());
}

export async function updatePage(id: string, body: unknown, userId: string): Promise<Result<unknown>> {
  const input = pageInput.partial().parse(body);
  const page = await Page.findById(id);
  if (!page) return notFound('Page not found');

  // §12 — no page ships without a unique title + meta description.
  const nextStatus = input.status ?? page.status;
  const nextSeo = { ...page.seo, ...input.seo };
  if (nextStatus === 'published' && (!nextSeo.title?.trim() || !nextSeo.description?.trim())) {
    return unprocessable('A page cannot be published without an SEO title and meta description (§12).', [
      { field: 'seo.title', message: 'Required to publish' },
      { field: 'seo.description', message: 'Required to publish' },
    ]);
  }

  Object.assign(page, input, { updatedBy: userId });
  await page.save();
  await revalidate(pagePaths(page.key));
  return ok(page.toJSON());
}

export async function deletePage(id: string): Promise<Result<unknown>> {
  const page = await Page.findByIdAndDelete(id);
  if (!page) return notFound('Page not found');
  await revalidate(pagePaths(page.key));
  return noContent();
}
