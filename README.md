# chimera-api

Content and lead API for Chimera Biotech. Node 22 · TypeScript · Express · Mongoose.

Serves two consumers: `chimera-web` (the public site, reads at build time and on
revalidation) and `chimera-dashboard` (the operations SPA).

---

## Run it

```bash
cp .env.example .env
npm install
npm run db:up          # Mongo 7 in Docker, host port 27018
npm run seed:demo      # or `npm run seed` — see below
npm run dev            # http://localhost:4000
```

`GET /health` reports which adapters are active.

### Seed modes

| Command | Result |
|---|---|
| `npm run seed` | Catalogue seeded as **drafts**. Nothing publishes, because every spec row is unverified. This is the honest starting state. |
| `npm run seed:reset` | Same, after clearing all collections. |
| `npm run seed:demo` | Clears, seeds, then **publishes with placeholder figures** so the site can be reviewed with content in it. Switches on a site-wide banner saying every figure is a placeholder. Never point this at production. |

Sign in with `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` (defaults in
`.env.example`). The seed also creates an `editor@` and a `sales@` account with
the same password, for testing role guards.

---

## Shape

```
src/
  adapters/       storage (local | s3) and mail (file | volanea) behind interfaces
  config/env.ts   every env var, read once, validated
  models/         the 10 entities of PRD §7
  modules/        function modules — take arguments, return { status, json }
  routes/         thin: parse → call a module → send
  middleware/     auth (JWT + tokenVersion), rate limits, error mapping
  validation/     zod schemas, one per input
  seed/           seed data + placeholder PDF/SVG generators
```

**The pattern** (PRD §5.1): routes never contain logic, modules never touch
`req`/`res`, provider code never leaks past an adapter. Swapping S3 for another
store is a sibling file next to `adapters/storage/s3.ts`, not edits across the
codebase.

---

## The two rules the API exists to enforce

Both live in code, not in a review checklist.

**1. A product cannot be published without a minimum spec set.**
`modules/products/publishRules.ts` is the whole enforcement, and it is pure —
the same function produces the API's 422 and the dashboard's publish bar, so
they cannot disagree. It checks: a 12-word-minimum description, analytes,
sample types, method, format, intended use, the category's required spec slugs,
**every spec row verified**, at most 4 key rows, a pack size with a SKU and HSN,
an attached IFU, an image, and an SEO title and description.

**2. Every submission produces a routed notification.**
`modules/leads/routing.ts` maps type + country onto the three inboxes, and
`notifications.ts` records the outcome on the lead. A mail failure never loses
the lead: it sets `notificationError`, which surfaces as a red bar across the
dashboard and a **Retry notification** button on the lead.

| Funnel | India | Outside India |
|---|---|---|
| Quote, document request | `sales@` | `exports@` |
| Distributor | `sales@` | `exports@` + `sales@` |
| OEM | `exports@` + `sales@` | `exports@` |
| Contact, careers | `info@` | `info@` |

---

## Gated documents

The highest-value feature in the PRD, and the one with the most ways to get
wrong. The flow:

1. `POST /api/documents/request` — validated, a `Lead` of type `document` is
   created **first**.
2. An HMAC token (`mediaId.leadId.expiry.signature`) is minted, signed with
   `DOCUMENT_LINK_SECRET` — deliberately **not** `JWT_SECRET`, so a leaked
   download link can never become a dashboard session.
3. The link is emailed and returned to the browser.
4. `GET /api/documents/download/:token` verifies the signature in constant time,
   records the download on both the media and the lead, then streams (local) or
   redirects to a 5-minute presigned URL (S3).

The public product payload never carries a URL for a gated file — only the media
id and `gated: true`. That is asserted in `modules/catalog/presenters.ts`.

---

## Environment

Everything is in `.env.example` with comments. The ones that matter:

| Var | Notes |
|---|---|
| `MONGODB_URI` | Local Docker uses host port **27018** (27017 was already taken on this machine). Atlas is a drop-in replacement. |
| `STORAGE_DRIVER` | `local` writes to `./var/uploads`; `s3` needs the four `S3_*` vars. |
| `MAIL_DRIVER` | `file` writes `.eml` files to `./var/mail` — inspect them to see exactly what a buyer and a salesperson would receive. `volanea` needs the four `VOLANEA_*` vars. |
| `MAIL_DOMAIN` | Decision D1. All three inboxes derive from it. |
| `PRICING_MODE` | Decision D5. `quote` strips prices server-side so no build of the site can render one. |
| `REVALIDATE_SECRET` | Must match `chimera-web`. Publishing pings the site to rebuild affected routes. |

`S3` and `Volanea` are written and typed but unexercised — no credentials
existed at build time. See `DECISIONS.md` in the parent folder.

---

## API surface

```
GET  /health

POST /api/auth/login                     GET  /api/auth/me
POST /api/auth/change-password

# Public — what the Next.js site reads
GET  /api/categories                     GET  /api/categories/:slug
GET  /api/products                       GET  /api/products/:slug
GET  /api/products/slugs                 GET  /api/pages/:key
GET  /api/posts                          GET  /api/posts/:slug
GET  /api/certifications                 GET  /api/exports  ·  /api/exports/:slug
GET  /api/settings                       GET  /api/documents

# Public — the four funnels
POST /api/leads/quote  ·  /leads/distributor  ·  /leads/oem
POST /api/leads/contact  ·  /leads/career
POST /api/documents/request
GET  /api/documents/download/:token

# Admin — JWT required
GET/POST/PATCH/DELETE  /api/admin/{products,categories,media,pages,posts,
                                   certifications,country-pages,leads,users}
POST                   /api/admin/products/:id/status     ← the publish gate
GET                    /api/admin/leads/stats  ·  /leads/export.csv
POST                   /api/admin/leads/:id/notes  ·  /leads/:id/resend
PUT                    /api/admin/settings/:key
```

Roles: `editor` edits content, `sales` works the lead queue, `owner` does both
plus users and settings. Owner passes every guard.

---

## Rate limits

| Scope | Limit |
|---|---|
| Public reads | 240 / minute |
| Any form | 8 / 15 minutes |
| Login | 10 / 15 minutes, successful attempts not counted |
| Signed-link redemption | 20 / minute |

Plus a honeypot field on every funnel: a filled `website` field is accepted with
a normal-looking response and silently dropped, so a bot never learns it was
caught.

---

## Not done

- No automated test suite. The publish gate, lead routing and signed-link
  verification were exercised by hand against a running server (see the parent
  `HANDOVER.md`), but they deserve real tests before this goes near production.
- S3 and Volanea adapters are untested against live services.
- No deployment config beyond the app being stateless and disposable.

---

## Deployment

- **API**: Elastic Beanstalk (`chimera-env`, us-east-2) via CodePipeline from `main`.
  Public URL: `https://chimera-api.zealoop.com` (health: `/health`).
  The `.platform/hooks/prebuild` hook compiles TypeScript on the instance, so the
  pipeline can ship raw source. Runtime config lives in EB environment properties.
- **Dashboard** / **Web**: AWS Amplify, auto-deploy from `main` of their repos.
