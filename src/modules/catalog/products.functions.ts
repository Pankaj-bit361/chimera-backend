import { escapeRegex } from '../../lib/escapeRegex.js';
import { Category } from '../../models/Category.js';
import { Certification } from '../../models/Certification.js';
import { Product, type ProductDoc } from '../../models/Product.js';
import { created, noContent, notFound, ok, unprocessable, type Result } from '../../lib/http.js';
import { productPaths, revalidate } from '../../lib/revalidate.js';
import { uniqueSlug } from '../../lib/slug.js';
import { productInput } from '../../validation/schemas.js';
import { checkPublishable } from '../products/publishRules.js';
import { presentDocument, presentImage, presentPackSizes, presentSpecs } from './presenters.js';

const PUBLIC_POPULATE = [
  { path: 'category', select: 'name slug' },
  { path: 'images' },
  { path: 'documents.media' },
  { path: 'regulatory.certifications' },
  { path: 'relatedProducts', select: 'name slug shortDescription images status', populate: { path: 'images' } },
];

function presentPublic(product: ProductDoc) {
  const category = product.category as unknown as { name?: string; slug?: string } | null;

  return {
    id: String(product._id),
    name: product.name,
    slug: product.slug,
    status: product.status,
    category: category?.slug ? { name: category.name, slug: category.slug } : null,
    shortDescription: product.shortDescription,
    intendedUse: product.intendedUse,
    analytes: product.analytes,
    sampleTypes: product.sampleTypes,
    method: product.method,
    format: product.format,
    specGroups: presentSpecs(product.specs as never),
    /*
     * A roadmap device is not released for sale. Serving its SKU, HSN and MOQ
     * through the public presenter made an unlicensed IVD with every figure
     * reading "To be established" look like orderable stock to a procurement
     * officer — and put that SKU into the page's MedicalDevice structured data.
     * Stripped here, in the presenter, so no build of any front end can render
     * it. Same discipline as indicativePrice under PRICING_MODE=quote.
     */
    packSizes: product.status === 'roadmap' ? [] : presentPackSizes(product.packSizes as never),
    regulatory: {
      cdscoLicenceNo: product.regulatory?.cdscoLicenceNo ?? '',
      icmrRegistrationNo: product.regulatory?.icmrRegistrationNo ?? '',
      iso13485: product.regulatory?.iso13485 ?? '',
      iso9001: product.regulatory?.iso9001 ?? '',
      ceMark: product.regulatory?.ceMark ?? '',
      gmp: product.regulatory?.gmp ?? '',
      notes: product.regulatory?.notes ?? '',
      certifications: ((product.regulatory?.certifications ?? []) as unknown as Array<{
        _id: unknown;
        name: string;
        issuer: string;
        number?: string;
        validTill?: Date;
        status: string;
      }>)
        .filter((cert) => cert?.status === 'published')
        .map((cert) => ({
          id: String(cert._id),
          name: cert.name,
          issuer: cert.issuer,
          number: cert.number ?? '',
          validTill: cert.validTill ?? null,
        })),
    },
    /**
     * §6.5 — the verification stamp only appears when every published spec row
     * has been checked against a document ON FILE. Teal is never decorative.
     *
     * The document half of that sentence used to be missing: the flag was
     * every(spec.verified) alone, so a product with every row ticked and no
     * IFU or COA attached still stamped "verified" on a medical device. An
     * editor's tick is a claim; the attached document is the evidence, and the
     * stamp asserts the evidence exists.
     */
    verified:
      (product.specs?.length ?? 0) > 0 &&
      (product.specs ?? []).every((spec) => spec.verified) &&
      (product.documents ?? []).some((doc) => doc.kind === 'ifu' || doc.kind === 'coa'),
    images: (product.images ?? []).map((media) => presentImage(media as never)).filter(Boolean),
    documents: (product.documents ?? [])
      .map((doc) => presentDocument({ kind: doc.kind as never, label: doc.label, media: doc.media as never }))
      .filter(Boolean),
    relatedProducts: ((product.relatedProducts ?? []) as unknown as ProductDoc[])
      .filter((related) => related?.status === 'published')
      .map((related) => ({
        id: String(related._id),
        name: related.name,
        slug: related.slug,
        shortDescription: related.shortDescription,
        image: presentImage(related.images?.[0] as never),
      })),
    seo: product.seo,
    updatedAt: product.updatedAt,
  };
}

// ─── Public ──────────────────────────────────────────────────────────────────

export async function listPublicProducts(query: {
  category?: string;
  q?: string;
  limit?: number;
}): Promise<Result<unknown>> {
  const filter: Record<string, unknown> = { status: 'published' };

  if (query.category) {
    const category = await Category.findOne({ slug: query.category });
    if (!category) return ok({ items: [] });
    filter.category = category._id;
  }
  if (query.q) filter.$text = { $search: query.q };

  const products = await Product.find(filter)
    .sort({ featured: -1, order: 1, name: 1 })
    .limit(Math.min(query.limit ?? 60, 100))
    .populate([{ path: 'category', select: 'name slug' }, { path: 'images' }]);

  return ok({
    items: products.map((product) => {
      const category = product.category as unknown as { name?: string; slug?: string } | null;
      return {
        id: String(product._id),
        name: product.name,
        slug: product.slug,
        category: category?.slug ? { name: category.name, slug: category.slug } : null,
        shortDescription: product.shortDescription,
        analytes: product.analytes,
        format: product.format,
        image: presentImage(product.images?.[0] as never),
        keySpecs: (product.specs ?? [])
          .filter((spec) => spec.key)
          .slice(0, 3)
          .map((spec) => ({ label: spec.label, value: spec.value, unit: spec.unit ?? '' })),
      };
    }),
  });
}

export async function getPublicProduct(slug: string): Promise<Result<unknown>> {
  const product = await Product.findOne({ slug, status: { $in: ['published', 'roadmap'] } }).populate(
    PUBLIC_POPULATE,
  );
  if (!product) return notFound('Product not found');
  return ok(presentPublic(product));
}

/** Slugs for `generateStaticParams` and the sitemap. */
export async function listPublicProductSlugs(): Promise<Result<unknown>> {
  const products = await Product.find({ status: { $in: ['published', 'roadmap'] } })
    .select('slug updatedAt category status')
    .populate({ path: 'category', select: 'slug' });
  return ok({
    items: products.map((product) => ({
      slug: product.slug,
      // The sitemap needs this to keep unreleased devices out of the index —
      // generateStaticParams still wants them, so the filter belongs downstream.
      status: product.status,
      categorySlug: (product.category as unknown as { slug?: string } | null)?.slug ?? null,
      updatedAt: product.updatedAt,
    })),
  });
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export async function listProducts(query: { category?: string; status?: string; q?: string }): Promise<
  Result<unknown>
> {
  const filter: Record<string, unknown> = {};
  if (query.category) filter.category = query.category;
  if (query.status) filter.status = query.status;
  if (query.q) filter.name = { $regex: escapeRegex(query.q), $options: 'i' };

  const products = await Product.find(filter)
    .sort({ order: 1, name: 1 })
    .populate({ path: 'category', select: 'name slug' });

  return ok({
    items: products.map((product) => ({
      id: String(product._id),
      name: product.name,
      slug: product.slug,
      status: product.status,
      category: product.category,
      specCount: product.specs?.length ?? 0,
      unverifiedSpecs: (product.specs ?? []).filter((spec) => !spec.verified).length,
      packSizeCount: product.packSizes?.length ?? 0,
      updatedAt: product.updatedAt,
    })),
  });
}

export async function getProduct(id: string): Promise<Result<unknown>> {
  const product = await Product.findById(id).populate(PUBLIC_POPULATE);
  if (!product) return notFound('Product not found');

  const category = await Category.findById(
    (product.category as unknown as { _id?: unknown })?._id ?? product.category,
  );

  return ok({
    ...product.toJSON(),
    /** The publish bar reads this — same rules as the API's own 422. */
    publishCheck: checkPublishable(product, category),
  });
}

async function applyInput(product: ProductDoc, input: ReturnType<typeof productInput.partial>['_output']) {
  if (input.name !== undefined) product.name = input.name;
  if (input.category !== undefined) product.category = input.category as never;
  if (input.shortDescription !== undefined) product.shortDescription = input.shortDescription;
  if (input.intendedUse !== undefined) product.intendedUse = input.intendedUse;
  if (input.analytes !== undefined) product.analytes = input.analytes;
  if (input.sampleTypes !== undefined) product.sampleTypes = input.sampleTypes;
  if (input.method !== undefined) product.method = input.method;
  if (input.format !== undefined) product.format = input.format;
  if (input.specs !== undefined) product.specs = input.specs as never;
  if (input.packSizes !== undefined) product.packSizes = input.packSizes as never;
  if (input.regulatory !== undefined) product.regulatory = { ...product.regulatory, ...input.regulatory } as never;
  if (input.images !== undefined) product.images = input.images as never;
  if (input.documents !== undefined) product.documents = input.documents as never;
  if (input.relatedProducts !== undefined) product.relatedProducts = input.relatedProducts as never;
  if (input.seo !== undefined) product.seo = { ...product.seo, ...input.seo } as never;
  if (input.featured !== undefined) product.featured = input.featured;
  if (input.order !== undefined) product.order = input.order;
}

export async function createProduct(body: unknown): Promise<Result<unknown>> {
  const input = productInput.parse(body);
  const slug = await uniqueSlug(input.slug ?? input.name, async (candidate) =>
    Boolean(await Product.exists({ slug: candidate })),
  );

  const product = new Product({ slug, category: input.category, shortDescription: input.shortDescription, name: input.name });
  await applyInput(product, input);
  // New products always start as drafts. Publishing is a separate, checked step.
  product.status = input.status === 'roadmap' ? 'roadmap' : 'draft';
  await product.save();

  return created(product.toJSON());
}

export async function updateProduct(id: string, body: unknown): Promise<Result<unknown>> {
  const input = productInput.partial().parse(body);
  const product = await Product.findById(id);
  if (!product) return notFound('Product not found');

  if (input.slug && input.slug !== product.slug) {
    product.slug = await uniqueSlug(input.slug, async (candidate) =>
      Boolean(await Product.exists({ slug: candidate, _id: { $ne: product._id } })),
    );
  }
  await applyInput(product, input);

  // A published product edited below the bar is demoted, not silently broken.
  if (product.status === 'published') {
    const category = await Category.findById(product.category);
    const check = checkPublishable(product, category);
    if (!check.publishable) {
      product.status = 'draft';
      await product.save();
      const populated = await Product.findById(product._id).populate({ path: 'category', select: 'slug' });
      await revalidate(
        productPaths({
          slug: product.slug,
          categorySlug: (populated?.category as unknown as { slug?: string } | null)?.slug,
        }),
      );
      return unprocessable(
        'Saved, but this product no longer meets the publishing requirements and has been moved to draft.',
        check.blockers,
      );
    }
  }

  await product.save();

  const populated = await Product.findById(product._id).populate({ path: 'category', select: 'slug' });
  await revalidate(
    productPaths({
      slug: product.slug,
      categorySlug: (populated?.category as unknown as { slug?: string } | null)?.slug,
    }),
  );
  return ok(product.toJSON());
}

/**
 * §9 8.1 — the publish gate. This is the only path to `status: published`.
 */
export async function setProductStatus(
  id: string,
  status: 'draft' | 'published' | 'roadmap' | 'archived',
): Promise<Result<unknown>> {
  const product = await Product.findById(id);
  if (!product) return notFound('Product not found');

  if (status === 'published') {
    const category = await Category.findById(product.category);
    const check = checkPublishable(product, category);
    if (!check.publishable) {
      return unprocessable(
        'This product cannot be published yet — see the blockers below.',
        check.blockers,
      );
    }
    product.publishedAt = product.publishedAt ?? new Date();
  }

  product.status = status;
  await product.save();

  const populated = await Product.findById(product._id).populate({ path: 'category', select: 'slug' });
  await revalidate(
    productPaths({
      slug: product.slug,
      categorySlug: (populated?.category as unknown as { slug?: string } | null)?.slug,
    }),
  );

  return ok({ id: String(product._id), status: product.status, publishedAt: product.publishedAt });
}

export async function deleteProduct(id: string): Promise<Result<unknown>> {
  const product = await Product.findById(id).populate({ path: 'category', select: 'slug' });
  if (!product) return notFound('Product not found');
  const categorySlug = (product.category as unknown as { slug?: string } | null)?.slug;
  await product.deleteOne();
  await revalidate(productPaths({ slug: product.slug, categorySlug }));
  return noContent();
}

/** Certifications available to attach — used by the product editor. */
export async function listAttachableCertifications(): Promise<Result<unknown>> {
  const certs = await Certification.find().sort({ order: 1, name: 1 });
  return ok({ items: certs.map((cert) => cert.toJSON()) });
}
