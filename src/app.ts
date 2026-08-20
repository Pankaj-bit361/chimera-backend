import path from 'node:path';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { publicRouter } from './routes/public.js';

export function createApp() {
  const app = express();

  // Only when something actually terminates in front of us. Trusting a hop that
  // does not exist lets any client forge X-Forwarded-For and mint itself a new
  // rate-limit bucket per request. See env.trustProxy.
  app.set('trust proxy', env.trustProxy);

  app.use(
    helmet({
      // The API serves JSON and file downloads, never HTML pages.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin(origin, callback) {
        // Server-to-server calls (Next.js build) send no Origin header.
        // CORS_ORIGINS=* allows every origin (reflected, so credentials still work).
        if (!origin || env.corsOrigins.includes('*') || env.corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        callback(new Error(`Origin not allowed: ${origin}`));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'chimera-api',
      env: env.nodeEnv,
      storage: env.storage.driver,
      mail: env.mail.driver,
      pricingMode: env.pricingMode,
    });
  });

  /**
   * Ungated local uploads. In S3 mode nothing is served from here — the bucket
   * (or a CDN in front of it) answers instead.
   */
  if (env.storage.driver === 'local') {
    app.use(
      '/uploads',
      express.static(path.resolve(process.cwd(), env.storage.localDir), {
        maxAge: '7d',
        index: false,
        dotfiles: 'deny',
      }),
    );
  }

  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', publicRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
