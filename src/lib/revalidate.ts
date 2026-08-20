import { env } from '../config/env.js';
import { logger } from './logger.js';

/**
 * On-demand revalidation (§5.1, §9 8.5).
 *
 * Publishing in the dashboard pings the Next.js site to rebuild the affected
 * routes — that is what makes "static generation" compatible with "the team can
 * update the site without a developer" (G5).
 *
 * Fire-and-forget by design: a slow or down web host must never make a save
 * fail in the dashboard. Failures are logged, and a full rebuild fixes drift.
 */
export async function revalidate(paths: string[]): Promise<void> {
  if (!env.web.revalidateSecret || paths.length === 0) return;

  const unique = [...new Set(paths)];
  try {
    const response = await fetch(`${env.web.baseUrl.replace(/\/$/, '')}/api/revalidate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-revalidate-secret': env.web.revalidateSecret,
      },
      body: JSON.stringify({ paths: unique }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      logger.warn(`revalidate failed (${response.status})`, unique);
      return;
    }
    logger.debug('revalidated', unique);
  } catch (error) {
    logger.warn('revalidate unreachable', { error: String(error), paths: unique });
  }
}

/** Every route that shows a product. Called on any product write. */
export function productPaths(input: {
  slug: string;
  categorySlug?: string;
}): string[] {
  const paths = ['/', '/products', '/sitemap.xml'];
  if (input.categorySlug) {
    paths.push(`/products/${input.categorySlug}`);
    paths.push(`/products/${input.categorySlug}/${input.slug}`);
  }
  return paths;
}

export function categoryPaths(slug: string): string[] {
  return ['/', '/products', `/products/${slug}`, '/sitemap.xml'];
}

export function postPaths(slug: string): string[] {
  return ['/resources', `/resources/${slug}`, '/sitemap.xml'];
}

export function pagePaths(key: string): string[] {
  const map: Record<string, string> = {
    about: '/about',
    'about-manufacturing-quality': '/about/manufacturing-quality',
    'about-certifications': '/about/certifications',
    'about-team': '/about/team',
    'oem-manufacturing': '/oem-manufacturing',
    'become-a-distributor': '/become-a-distributor',
    exports: '/exports',
    faq: '/faq',
    careers: '/careers',
    events: '/events',
    contact: '/contact',
    'privacy-policy': '/privacy-policy',
    'terms-conditions': '/terms-conditions',
    'refund-cancellation-policy': '/refund-cancellation-policy',
    disclaimer: '/disclaimer',
  };
  const path = map[key];
  return path ? [path, '/sitemap.xml'] : ['/sitemap.xml'];
}
