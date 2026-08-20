import { created, noContent, notFound, ok, type Result } from '../../lib/http.js';
import { revalidate } from '../../lib/revalidate.js';
import { slugify, uniqueSlug } from '../../lib/slug.js';
import { CountryPage } from '../../models/CountryPage.js';
import { countryPageInput } from '../../validation/schemas.js';
import { presentImage } from '../catalog/presenters.js';

/** §10 Phase 4 — `/exports/{country}-diagnostic-kit-supplier`. */
function defaultSlug(country: string): string {
  return slugify(`${country}-diagnostic-kit-supplier`);
}

export async function listPublicCountryPages(): Promise<Result<unknown>> {
  const pages = await CountryPage.find({ status: 'published' }).sort({ order: 1, country: 1 });
  return ok({
    items: pages.map((page) => ({
      country: page.country,
      countryCode: page.countryCode,
      slug: page.slug,
      intro: page.intro,
    })),
  });
}

export async function getPublicCountryPage(slug: string): Promise<Result<unknown>> {
  const page = await CountryPage.findOne({ slug, status: 'published' }).populate({
    path: 'focusProducts',
    select: 'name slug shortDescription status images category',
    populate: [{ path: 'images' }, { path: 'category', select: 'slug' }],
  });
  if (!page) return notFound('Export page not found');

  return ok({
    country: page.country,
    countryCode: page.countryCode,
    slug: page.slug,
    intro: page.intro,
    regulatoryNotes: page.regulatoryNotes,
    logistics: page.logistics,
    seo: page.seo,
    focusProducts: ((page.focusProducts ?? []) as unknown as Array<{
      _id: unknown;
      name: string;
      slug: string;
      shortDescription: string;
      status: string;
      images?: unknown[];
      category?: { slug?: string };
    }>)
      .filter((product) => product?.status === 'published')
      .map((product) => ({
        id: String(product._id),
        name: product.name,
        slug: product.slug,
        categorySlug: product.category?.slug ?? null,
        shortDescription: product.shortDescription,
        image: presentImage(product.images?.[0] as never),
      })),
  });
}

export async function listCountryPages(): Promise<Result<unknown>> {
  const pages = await CountryPage.find().sort({ order: 1, country: 1 });
  return ok({ items: pages.map((page) => page.toJSON()) });
}

export async function getCountryPage(id: string): Promise<Result<unknown>> {
  const page = await CountryPage.findById(id);
  if (!page) return notFound('Export page not found');
  return ok(page.toJSON());
}

export async function createCountryPage(body: unknown): Promise<Result<unknown>> {
  const input = countryPageInput.parse(body);
  const slug = await uniqueSlug(input.slug ?? defaultSlug(input.country), async (candidate) =>
    Boolean(await CountryPage.exists({ slug: candidate })),
  );
  const page = await CountryPage.create({ ...input, slug });
  await revalidate(['/exports', `/exports/${slug}`, '/sitemap.xml']);
  return created(page.toJSON());
}

export async function updateCountryPage(id: string, body: unknown): Promise<Result<unknown>> {
  const input = countryPageInput.partial().parse(body);
  const page = await CountryPage.findById(id);
  if (!page) return notFound('Export page not found');

  if (input.slug && input.slug !== page.slug) {
    page.slug = await uniqueSlug(input.slug, async (candidate) =>
      Boolean(await CountryPage.exists({ slug: candidate, _id: { $ne: page._id } })),
    );
  }
  Object.assign(page, { ...input, slug: page.slug });
  await page.save();
  await revalidate(['/exports', `/exports/${page.slug}`, '/sitemap.xml']);
  return ok(page.toJSON());
}

export async function deleteCountryPage(id: string): Promise<Result<unknown>> {
  const page = await CountryPage.findByIdAndDelete(id);
  if (!page) return notFound('Export page not found');
  await revalidate(['/exports', '/sitemap.xml']);
  return noContent();
}
