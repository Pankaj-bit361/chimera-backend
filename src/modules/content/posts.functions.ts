import { storage } from '../../adapters/storage/index.js';
import { created, noContent, notFound, ok, unprocessable, type Result } from '../../lib/http.js';
import { postPaths, revalidate } from '../../lib/revalidate.js';
import { uniqueSlug } from '../../lib/slug.js';
import { Post, type PostDoc } from '../../models/Post.js';
import { postInput } from '../../validation/schemas.js';
import { presentImage } from '../catalog/presenters.js';

function presentPublic(post: PostDoc) {
  return {
    id: String(post._id),
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    body: post.body,
    author: post.author,
    tags: post.tags,
    readingMinutes: post.readingMinutes,
    publishedAt: post.publishedAt,
    cover: presentImage(post.cover as never),
    relatedProducts: ((post.relatedProducts ?? []) as unknown as Array<{
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
    seo: post.seo,
  };
}

const PUBLIC_POPULATE = [
  { path: 'cover' },
  {
    path: 'relatedProducts',
    select: 'name slug shortDescription status images category',
    populate: [{ path: 'images' }, { path: 'category', select: 'slug' }],
  },
];

export async function listPublicPosts(query: { limit?: number; tag?: string }): Promise<Result<unknown>> {
  const filter: Record<string, unknown> = { status: 'published', publishedAt: { $lte: new Date() } };
  if (query.tag) filter.tags = query.tag;

  const posts = await Post.find(filter)
    .sort({ publishedAt: -1 })
    .limit(Math.min(query.limit ?? 24, 60))
    .populate([{ path: 'cover' }]);

  return ok({
    items: posts.map((post) => ({
      id: String(post._id),
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      tags: post.tags,
      readingMinutes: post.readingMinutes,
      publishedAt: post.publishedAt,
      cover: presentImage(post.cover as never),
    })),
  });
}

export async function getPublicPost(slug: string): Promise<Result<unknown>> {
  const post = await Post.findOne({
    slug,
    status: 'published',
    publishedAt: { $lte: new Date() },
  }).populate(PUBLIC_POPULATE);
  if (!post) return notFound('Post not found');
  return ok(presentPublic(post));
}

export async function listPosts(): Promise<Result<unknown>> {
  const posts = await Post.find().sort({ createdAt: -1 }).select('title slug status publishedAt tags');
  return ok({ items: posts.map((post) => post.toJSON()) });
}

export async function getPost(id: string): Promise<Result<unknown>> {
  const post = await Post.findById(id).populate([{ path: 'cover' }]);
  if (!post) return notFound('Post not found');
  return ok({ ...post.toJSON(), coverUrl: post.cover ? presentImage(post.cover as never)?.url : null });
}

export async function createPost(body: unknown): Promise<Result<unknown>> {
  const input = postInput.parse(body);
  const slug = await uniqueSlug(input.slug ?? input.title, async (candidate) =>
    Boolean(await Post.exists({ slug: candidate })),
  );
  const post = await Post.create({ ...input, slug, status: 'draft' });
  return created(post.toJSON());
}

export async function updatePost(id: string, body: unknown): Promise<Result<unknown>> {
  const input = postInput.partial().parse(body);
  const post = await Post.findById(id);
  if (!post) return notFound('Post not found');

  if (input.slug && input.slug !== post.slug) {
    post.slug = await uniqueSlug(input.slug, async (candidate) =>
      Boolean(await Post.exists({ slug: candidate, _id: { $ne: post._id } })),
    );
  }

  const nextStatus = input.status ?? post.status;
  if (nextStatus === 'published') {
    const nextRelated = input.relatedProducts ?? post.relatedProducts;
    // §10 Phase 4 — "every post ends in a product link". The old blog's defect.
    if (!nextRelated?.length) {
      return unprocessable('Link at least one product before publishing — a post that links to nothing is the failure the old blog had.', [
        { field: 'relatedProducts', message: 'At least one related product is required to publish.' },
      ]);
    }
    const nextSeo = { ...post.seo, ...input.seo };
    if (!nextSeo.title?.trim() || !nextSeo.description?.trim()) {
      return unprocessable('A post cannot be published without an SEO title and meta description (§12).');
    }
    if (!input.publishedAt && !post.publishedAt) post.publishedAt = new Date();
  }

  Object.assign(post, { ...input, slug: post.slug });
  if (input.publishedAt) post.publishedAt = new Date(input.publishedAt);
  await post.save();

  await revalidate(postPaths(post.slug));
  return ok(post.toJSON());
}

export async function deletePost(id: string): Promise<Result<unknown>> {
  const post = await Post.findByIdAndDelete(id);
  if (!post) return notFound('Post not found');
  await revalidate(postPaths(post.slug));
  return noContent();
}

export { storage };
