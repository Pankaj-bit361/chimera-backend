import rateLimit from 'express-rate-limit';

/** §12 — rate limiting on public forms. */
const message = {
  error: 'Too many requests. Please try again shortly.',
  code: 'rate_limited',
};

/** Public reads: generous, mostly a scraper brake. */
export const publicReadLimiter = rateLimit({
  windowMs: 60_000,
  limit: 240,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
});

/** Every form on the site. Tight enough to make bulk submission pointless. */
export const formLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
});

/** Login: brute-force brake. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message,
});

/** Signed-link redemption — a leaked link should not become a download farm. */
export const downloadLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
});
