import { Category, type CategoryDoc } from '../../models/Category.js';
import { Product } from '../../models/Product.js';
import { created, noContent, notFound, ok, unprocessable, type Result } from '../../lib/http.js';
import { categoryPaths, revalidate } from '../../lib/revalidate.js';
import { slugify, uniqueSlug } from '../../lib/slug.js';
import { categoryInput } from '../../validation/schemas.js';
import { presentImage } from './presenters.js';

function present(category: CategoryDoc | null, productCount = 0) {
  if (!category) return null;
  return {
    id: String(category._id),
    name: category.name,
    slug: category.slug,
    tagline: category.tagline,
    description: category.description,
    intro: category.intro,
    hero: presentImage(category.hero?.media as never),
    heroAlt: category.hero?.alt ?? '',
    seo: category.seo,
    order: category.order,
    productCount,
  };
}

// ─── Public ──────────────────────────────────────────────────────────────────

export async function listPublicCategories(): Promise<Result<unknown>> {
  const categories = await Category.find({ status: 'published' })
    .sort({ order: 1, name: 1 })
    .populate('hero.media');

  const counts = await Product.aggregate<{ _id: unknown; count: number }>([
    { $match: { status: 'published' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const countBySlugId = new Map(counts.map((row) => [String(row._id), row.count]));

  return ok({
    items: categories.map((category) => present(category, countBySlugId.get(String(category._id)) ?? 0)),
  });
}

export async function getPublicCategory(slug: string): Promise<Result<unknown>> {
  const category = await Category.findOne({ slug, status: 'published' }).populate('hero.media');
  if (!category) return notFound('Category not found');

  const products = await Product.find({
    category: category._id,
    status: { $in: ['published', 'roadmap'] },
  })
    .sort({ order: 1, name: 1 })
    .populate('images');

  return ok({
    category: present(category, products.filter((p) => p.status === 'published').length),
    products: products.map((product) => ({
      id: String(product._id),
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription,
      analytes: product.analytes,
      format: product.format,
      method: product.method,
      status: product.status,
      image: presentImage(product.images?.[0] as never),
      /** Card-level evidence: the key rows, so a grid still shows numbers. */
      keySpecs: (product.specs ?? [])
        .filter((spec) => spec.key)
        .slice(0, 3)
        .map((spec) => ({ label: spec.label, value: spec.value, unit: spec.unit ?? '' })),
    })),
  });
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export async function listCategories(): Promise<Result<unknown>> {
  const categories = await Category.find().sort({ order: 1, name: 1 });
  const counts = await Product.aggregate<{ _id: unknown; count: number }>([
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const byId = new Map(counts.map((row) => [String(row._id), row.count]));
  return ok({
    items: categories.map((category) => ({
      ...category.toJSON(),
      productCount: byId.get(String(category._id)) ?? 0,
    })),
  });
}

export async function getCategory(id: string): Promise<Result<unknown>> {
  const category = await Category.findById(id);
  if (!category) return notFound('Category not found');
  return ok(category.toJSON());
}

export async function createCategory(body: unknown): Promise<Result<unknown>> {
  const input = categoryInput.parse(body);
  const slug = await uniqueSlug(input.slug ?? input.name, async (candidate) =>
    Boolean(await Category.exists({ slug: candidate })),
  );

  const category = await Category.create({ ...input, slug });
  await revalidate(categoryPaths(slug));
  return created(category.toJSON());
}

export async function updateCategory(id: string, body: unknown): Promise<Result<unknown>> {
  const input = categoryInput.partial().parse(body);
  const category = await Category.findById(id);
  if (!category) return notFound('Category not found');

  if (input.slug && input.slug !== category.slug) {
    category.slug = await uniqueSlug(input.slug, async (candidate) =>
      Boolean(await Category.exists({ slug: candidate, _id: { $ne: category._id } })),
    );
  }
  Object.assign(category, { ...input, slug: category.slug });
  await category.save();

  await revalidate(categoryPaths(category.slug));
  return ok(category.toJSON());
}

export async function deleteCategory(id: string): Promise<Result<unknown>> {
  const inUse = await Product.countDocuments({ category: id });
  if (inUse > 0) {
    return unprocessable(
      `${inUse} product${inUse === 1 ? '' : 's'} still sit in this category. Move them first.`,
    );
  }
  const category = await Category.findByIdAndDelete(id);
  if (!category) return notFound('Category not found');
  await revalidate(categoryPaths(category.slug));
  return noContent();
}

export async function reorderCategories(body: unknown): Promise<Result<unknown>> {
  const ids = Array.isArray(body) ? (body as string[]) : ((body as { ids?: string[] })?.ids ?? []);
  await Promise.all(ids.map((id, index) => Category.findByIdAndUpdate(id, { order: index })));
  await revalidate(['/products', '/']);
  return ok({ reordered: ids.length });
}

export { slugify };
