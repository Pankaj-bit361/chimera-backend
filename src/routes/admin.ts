import { Router } from 'express';
import multer from 'multer';
import { route, send } from '../lib/http.js';
import { authenticate, requireEditor, requireOwner, requireSales } from '../middleware/auth.js';
import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  reorderCategories,
  updateCategory,
} from '../modules/catalog/categories.functions.js';
import {
  createProduct,
  deleteProduct,
  getProduct,
  listAttachableCertifications,
  listProducts,
  setProductStatus,
  updateProduct,
} from '../modules/catalog/products.functions.js';
import {
  createCertification,
  deleteCertification,
  listCertifications,
  updateCertification,
} from '../modules/content/certifications.functions.js';
import {
  createCountryPage,
  deleteCountryPage,
  getCountryPage,
  listCountryPages,
  updateCountryPage,
} from '../modules/content/countryPages.functions.js';
import {
  createPage,
  deletePage,
  getPage,
  listPages,
  updatePage,
} from '../modules/content/pages.functions.js';
import {
  createPost,
  deletePost,
  getPost,
  listPosts,
  updatePost,
} from '../modules/content/posts.functions.js';
import {
  addLeadNote,
  exportLeadsCsv,
  getLead,
  leadStats,
  listLeads,
  resendLeadNotification,
  updateLead,
} from '../modules/leads/leads.functions.js';
import {
  MAX_UPLOAD_BYTES,
  deleteMedia,
  listMedia,
  mediaUsage,
  updateMedia,
  uploadMedia,
} from '../modules/media/media.functions.js';
import { listSettings, upsertSetting } from '../modules/settings/settings.functions.js';
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
} from '../modules/users/users.functions.js';

/**
 * Admin API — everything behind a JWT.
 *
 * Roles (§7 A1–A3): `editor` edits content, `sales` works the lead queue,
 * `owner` does both plus users and settings. `requireRole` lets owner through
 * every guard, so the checks below read as the *minimum* role needed.
 */
export const adminRouter = Router();

adminRouter.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

// ─── Categories ──────────────────────────────────────────────────────────────
adminRouter.get('/categories', route(async (_req, res) => send(res, await listCategories())));
adminRouter.get('/categories/:id', route(async (req, res) => send(res, await getCategory(req.params.id!))));
adminRouter.post('/categories', requireEditor, route(async (req, res) => send(res, await createCategory(req.body))));
adminRouter.patch(
  '/categories/:id',
  requireEditor,
  route(async (req, res) => send(res, await updateCategory(req.params.id!, req.body))),
);
adminRouter.post(
  '/categories/reorder',
  requireEditor,
  route(async (req, res) => send(res, await reorderCategories(req.body))),
);
adminRouter.delete(
  '/categories/:id',
  requireEditor,
  route(async (req, res) => send(res, await deleteCategory(req.params.id!))),
);

// ─── Products ────────────────────────────────────────────────────────────────
adminRouter.get(
  '/products',
  route(async (req, res) =>
    send(
      res,
      await listProducts({
        category: req.query.category as string | undefined,
        status: req.query.status as string | undefined,
        q: req.query.q as string | undefined,
      }),
    ),
  ),
);
adminRouter.get('/products/:id', route(async (req, res) => send(res, await getProduct(req.params.id!))));
adminRouter.post('/products', requireEditor, route(async (req, res) => send(res, await createProduct(req.body))));
adminRouter.patch(
  '/products/:id',
  requireEditor,
  route(async (req, res) => send(res, await updateProduct(req.params.id!, req.body))),
);
/** The publish gate — §9 8.1, enforced here and nowhere else. */
adminRouter.post(
  '/products/:id/status',
  requireEditor,
  route(async (req, res) => send(res, await setProductStatus(req.params.id!, req.body?.status))),
);
adminRouter.delete(
  '/products/:id',
  requireEditor,
  route(async (req, res) => send(res, await deleteProduct(req.params.id!))),
);

// ─── Media ───────────────────────────────────────────────────────────────────
adminRouter.get(
  '/media',
  route(async (req, res) =>
    send(
      res,
      await listMedia({
        kind: req.query.kind as string | undefined,
        gated: req.query.gated as string | undefined,
        q: req.query.q as string | undefined,
      }),
    ),
  ),
);
adminRouter.post(
  '/media',
  requireEditor,
  upload.single('file'),
  route(async (req, res) => send(res, await uploadMedia(req.file, req.body, req.user!.id))),
);
adminRouter.get('/media/:id/usage', route(async (req, res) => send(res, await mediaUsage(req.params.id!))));
adminRouter.patch(
  '/media/:id',
  requireEditor,
  route(async (req, res) => send(res, await updateMedia(req.params.id!, req.body))),
);
adminRouter.delete(
  '/media/:id',
  requireEditor,
  route(async (req, res) => send(res, await deleteMedia(req.params.id!))),
);

// ─── Leads ───────────────────────────────────────────────────────────────────
adminRouter.get('/leads', requireSales, route(async (req, res) => send(res, await listLeads(req.query))));
adminRouter.get('/leads/stats', requireSales, route(async (_req, res) => send(res, await leadStats())));
adminRouter.get(
  '/leads/export.csv',
  requireSales,
  route(async (req, res) => {
    const { filename, csv } = await exportLeadsCsv(req.query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }),
);
adminRouter.get('/leads/:id', requireSales, route(async (req, res) => send(res, await getLead(req.params.id!))));
adminRouter.patch(
  '/leads/:id',
  requireSales,
  route(async (req, res) => send(res, await updateLead(req.params.id!, req.body))),
);
adminRouter.post(
  '/leads/:id/notes',
  requireSales,
  route(async (req, res) => send(res, await addLeadNote(req.params.id!, req.body, req.user!.id))),
);
adminRouter.post(
  '/leads/:id/resend',
  requireSales,
  route(async (req, res) => send(res, await resendLeadNotification(req.params.id!))),
);

// ─── Pages ───────────────────────────────────────────────────────────────────
adminRouter.get('/pages', route(async (_req, res) => send(res, await listPages())));
adminRouter.get('/pages/:id', route(async (req, res) => send(res, await getPage(req.params.id!))));
adminRouter.post(
  '/pages',
  requireEditor,
  route(async (req, res) => send(res, await createPage(req.body, req.user!.id))),
);
adminRouter.patch(
  '/pages/:id',
  requireEditor,
  route(async (req, res) => send(res, await updatePage(req.params.id!, req.body, req.user!.id))),
);
adminRouter.delete(
  '/pages/:id',
  requireEditor,
  route(async (req, res) => send(res, await deletePage(req.params.id!))),
);

// ─── Blog ────────────────────────────────────────────────────────────────────
adminRouter.get('/posts', route(async (_req, res) => send(res, await listPosts())));
adminRouter.get('/posts/:id', route(async (req, res) => send(res, await getPost(req.params.id!))));
adminRouter.post('/posts', requireEditor, route(async (req, res) => send(res, await createPost(req.body))));
adminRouter.patch(
  '/posts/:id',
  requireEditor,
  route(async (req, res) => send(res, await updatePost(req.params.id!, req.body))),
);
adminRouter.delete(
  '/posts/:id',
  requireEditor,
  route(async (req, res) => send(res, await deletePost(req.params.id!))),
);

// ─── Certifications ──────────────────────────────────────────────────────────
adminRouter.get('/certifications', route(async (_req, res) => send(res, await listCertifications())));
adminRouter.get(
  '/certifications/attachable',
  route(async (_req, res) => send(res, await listAttachableCertifications())),
);
adminRouter.post(
  '/certifications',
  requireEditor,
  route(async (req, res) => send(res, await createCertification(req.body))),
);
adminRouter.patch(
  '/certifications/:id',
  requireEditor,
  route(async (req, res) => send(res, await updateCertification(req.params.id!, req.body))),
);
adminRouter.delete(
  '/certifications/:id',
  requireEditor,
  route(async (req, res) => send(res, await deleteCertification(req.params.id!))),
);

// ─── Export country pages ────────────────────────────────────────────────────
adminRouter.get('/country-pages', route(async (_req, res) => send(res, await listCountryPages())));
adminRouter.get('/country-pages/:id', route(async (req, res) => send(res, await getCountryPage(req.params.id!))));
adminRouter.post(
  '/country-pages',
  requireEditor,
  route(async (req, res) => send(res, await createCountryPage(req.body))),
);
adminRouter.patch(
  '/country-pages/:id',
  requireEditor,
  route(async (req, res) => send(res, await updateCountryPage(req.params.id!, req.body))),
);
adminRouter.delete(
  '/country-pages/:id',
  requireEditor,
  route(async (req, res) => send(res, await deleteCountryPage(req.params.id!))),
);

// ─── Settings + users (owner only) ───────────────────────────────────────────
adminRouter.get('/settings', route(async (_req, res) => send(res, await listSettings())));
adminRouter.put(
  '/settings/:key',
  requireOwner,
  route(async (req, res) => send(res, await upsertSetting(req.params.key!, req.body, req.user!.id))),
);

adminRouter.get('/users', requireOwner, route(async (_req, res) => send(res, await listUsers())));
adminRouter.post('/users', requireOwner, route(async (req, res) => send(res, await createUser(req.body))));
adminRouter.patch(
  '/users/:id',
  requireOwner,
  route(async (req, res) => send(res, await updateUser(req.params.id!, req.body, req.user!.id))),
);
adminRouter.delete(
  '/users/:id',
  requireOwner,
  route(async (req, res) => send(res, await deleteUser(req.params.id!, req.user!.id))),
);
