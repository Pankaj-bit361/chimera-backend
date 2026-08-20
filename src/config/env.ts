import 'dotenv/config';
import { createHmac } from 'node:crypto';

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

function optional(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

function bool(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined) return fallback;
  return raw === 'true' || raw === '1';
}

function int(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const isProduction = optional('NODE_ENV', 'development') === 'production';
const jwtSecret = required('JWT_SECRET');
// DOCUMENT_LINK_SECRET is optional: when unset it is derived from JWT_SECRET
// (HMAC, so it is still a distinct key). Set it explicitly to rotate one
// without the other.
const documentLinkSecret =
  optional('DOCUMENT_LINK_SECRET') ||
  createHmac('sha256', jwtSecret).update('document-link').digest('hex');
const mailDomain = optional('MAIL_DOMAIN', 'chimera-biotech.com');

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  isProduction,
  port: int('PORT', 4000),
  corsOrigins: optional('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  mongoUri: required('MONGODB_URI'),

  jwtSecret,
  jwtTtl: optional('JWT_TTL', '12h'),
  documentLinkSecret,
  documentLinkTtlMinutes: int('DOCUMENT_LINK_TTL_MINUTES', 60),

  /**
   * Hops of X-Forwarded-For to trust. MUST stay 0 unless the API genuinely sits
   * behind a proxy that overwrites the header, because express-rate-limit keys
   * its buckets on req.ip: with a hop trusted and no proxy in front, any client
   * can hand itself a fresh bucket per request by inventing an XFF value, and
   * every limiter on the service — login, lead forms, downloads — stops
   * existing. Defaults to 1 in production (EB/ALB/nginx always sit in front),
   * 0 otherwise. Override with TRUST_PROXY if the topology differs.
   */
  trustProxy: int('TRUST_PROXY', isProduction ? 1 : 0),

  /**
   * The API's own public origin. Signed download links are built from this and
   * NEVER from the request's Host header: the header is attacker-controlled, so
   * deriving the link from it let anyone make Chimera email a link pointing at
   * a domain of their choosing, from Chimera's own address, to any recipient.
   */
  apiBaseUrl: optional('API_BASE_URL', 'http://localhost:4000'),

  storage: {
    driver: optional('STORAGE_DRIVER', 'local') as 'local' | 's3',
    localDir: optional('LOCAL_STORAGE_DIR', './var/uploads'),
    localPublicUrl: optional('LOCAL_STORAGE_PUBLIC_URL', 'http://localhost:4000/uploads'),
    s3Bucket: optional('S3_BUCKET'),
    s3Region: optional('S3_REGION', 'ap-south-1'),
    s3AccessKeyId: optional('S3_ACCESS_KEY_ID'),
    s3SecretAccessKey: optional('S3_SECRET_ACCESS_KEY'),
    s3PublicUrl: optional('S3_PUBLIC_URL'),
  },

  mail: {
    driver: optional('MAIL_DRIVER', 'file') as 'file' | 'volanea',
    localDir: optional('LOCAL_MAIL_DIR', './var/mail'),
    domain: mailDomain,
    fromName: optional('MAIL_FROM_NAME', 'Chimera Biotech'),
    // §9 8.3 — three routed inboxes. Derived from the domain unless overridden.
    inboxes: {
      info: optional('MAIL_INBOX_INFO') || `info@${mailDomain}`,
      sales: optional('MAIL_INBOX_SALES') || `sales@${mailDomain}`,
      exports: optional('MAIL_INBOX_EXPORTS') || `exports@${mailDomain}`,
    },
    volanea: {
      host: optional('VOLANEA_HOST'),
      port: int('VOLANEA_PORT', 587),
      user: optional('VOLANEA_USER'),
      password: optional('VOLANEA_PASSWORD'),
      secure: bool('VOLANEA_SECURE', false),
    },
  },

  web: {
    baseUrl: optional('WEB_BASE_URL', 'http://localhost:3000'),
    revalidateSecret: optional('REVALIDATE_SECRET'),
  },

  // D5 — see DECISIONS.md
  pricingMode: optional('PRICING_MODE', 'quote') as 'quote' | 'indicative',

  seed: {
    ownerEmail: optional('SEED_OWNER_EMAIL', 'owner@chimera-biotech.com'),
    ownerPassword: optional('SEED_OWNER_PASSWORD', 'ChangeMe!2026'),
  },
} as const;

if (env.jwtSecret === env.documentLinkSecret) {
  throw new Error('DOCUMENT_LINK_SECRET must differ from JWT_SECRET');
}
