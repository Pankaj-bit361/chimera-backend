import { Router } from 'express';
import { route, send } from '../lib/http.js';
import { downloadLimiter, formLimiter, publicReadLimiter } from '../middleware/rateLimit.js';
import {
  getPublicCategory,
  listPublicCategories,
} from '../modules/catalog/categories.functions.js';
import {
  getPublicProduct,
  listPublicProductSlugs,
  listPublicProducts,
} from '../modules/catalog/products.functions.js';
import { listPublicCertifications } from '../modules/content/certifications.functions.js';
import {
  getPublicCountryPage,
  listPublicCountryPages,
} from '../modules/content/countryPages.functions.js';
import { getPublicPage, listPublicPages } from '../modules/content/pages.functions.js';
import { getPublicPost, listPublicPosts } from '../modules/content/posts.functions.js';
import {
  downloadDocument,
  listPublicDocuments,
  requestDocument,
} from '../modules/documents/documents.functions.js';
import {
  submitCareer,
  submitContact,
  submitDistributor,
  submitOem,
  submitQuote,
} from '../modules/leads/leads.functions.js';
import { getPublicSettings } from '../modules/settings/settings.functions.js';

/**
 * Public API — everything the Next.js site reads at build time and everything
 * a browser posts. Thin routes only: parse, call the function module, send.
 */
export const publicRouter = Router();

publicRouter.use(publicReadLimiter);

// ─── Catalogue ───────────────────────────────────────────────────────────────
publicRouter.get('/categories', route(async (_req, res) => send(res, await listPublicCategories())));
publicRouter.get(
  '/categories/:slug',
  route(async (req, res) => send(res, await getPublicCategory(req.params.slug!))),
);
publicRouter.get(
  '/products',
  route(async (req, res) =>
    send(
      res,
      await listPublicProducts({
        category: req.query.category as string | undefined,
        q: req.query.q as string | undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      }),
    ),
  ),
);
publicRouter.get('/products/slugs', route(async (_req, res) => send(res, await listPublicProductSlugs())));
publicRouter.get(
  '/products/:slug',
  route(async (req, res) => send(res, await getPublicProduct(req.params.slug!))),
);

// ─── Content ─────────────────────────────────────────────────────────────────
publicRouter.get('/pages', route(async (_req, res) => send(res, await listPublicPages())));
publicRouter.get('/pages/:key', route(async (req, res) => send(res, await getPublicPage(req.params.key!))));
publicRouter.get(
  '/posts',
  route(async (req, res) =>
    send(
      res,
      await listPublicPosts({
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        tag: req.query.tag as string | undefined,
      }),
    ),
  ),
);
publicRouter.get('/posts/:slug', route(async (req, res) => send(res, await getPublicPost(req.params.slug!))));
publicRouter.get('/certifications', route(async (_req, res) => send(res, await listPublicCertifications())));
publicRouter.get('/exports', route(async (_req, res) => send(res, await listPublicCountryPages())));
publicRouter.get(
  '/exports/:slug',
  route(async (req, res) => send(res, await getPublicCountryPage(req.params.slug!))),
);
publicRouter.get('/settings', route(async (_req, res) => send(res, await getPublicSettings())));
publicRouter.get('/documents', route(async (_req, res) => send(res, await listPublicDocuments())));

// ─── The four funnels (§9 8.2) ───────────────────────────────────────────────
publicRouter.post('/leads/quote', formLimiter, route(async (req, res) => send(res, await submitQuote(req))));
publicRouter.post(
  '/leads/distributor',
  formLimiter,
  route(async (req, res) => send(res, await submitDistributor(req))),
);
publicRouter.post('/leads/oem', formLimiter, route(async (req, res) => send(res, await submitOem(req))));
publicRouter.post(
  '/leads/contact',
  formLimiter,
  route(async (req, res) => send(res, await submitContact(req))),
);
publicRouter.post(
  '/leads/career',
  formLimiter,
  route(async (req, res) => send(res, await submitCareer(req))),
);

// ─── Gated documents ─────────────────────────────────────────────────────────
publicRouter.post(
  '/documents/request',
  formLimiter,
  route(async (req, res) => send(res, await requestDocument(req))),
);
publicRouter.get(
  '/documents/download/:token',
  downloadLimiter,
  route(async (req, res) => {
    await downloadDocument(req.params.token!, res);
  }),
);
