import { createHmac, timingSafeEqual } from 'node:crypto';
import express, { Router } from 'express';
import { env } from '../config/env.js';
import { route } from '../lib/http.js';
import { logger } from '../lib/logger.js';
import { Lead } from '../models/Lead.js';

/**
 * Volanea delivery callbacks. Subscribed to `email.bounced` and
 * `email.complained`: when a buyer's address bounces, the newest lead from that
 * address is flagged, so the dashboard shows "notification failed" and sales
 * knows to phone instead of waiting on a reply that cannot arrive.
 *
 * Mounted before the global JSON parser: the signature is over the raw body.
 * `X-Volanea-Signature: t=<unix ms>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">`.
 */
const TOLERANCE_MS = 5 * 60 * 1000;

function verify(header: string | undefined, rawBody: Buffer, secret: string): boolean {
  const parts = Object.fromEntries(
    (header ?? '').split(',').map((part) => part.trim().split('=') as [string, string]),
  );
  const timestamp = Number(parts.t);
  if (!parts.v1 || !Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > TOLERANCE_MS) {
    return false;
  }
  const expected = createHmac('sha256', secret).update(`${parts.t}.${rawBody.toString('utf8')}`).digest('hex');
  const given = Buffer.from(parts.v1, 'hex');
  const wanted = Buffer.from(expected, 'hex');
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

type VolaneaEvent = {
  event?: string;
  test?: boolean;
  data?: { to?: string; detail?: unknown };
};

export const webhooksRouter = Router();

webhooksRouter.post('/volanea', express.raw({ type: '*/*', limit: '256kb' }), route(async (req, res) => {
  const secret = env.mail.volanea.webhookSecret;
  if (!secret) {
    res.status(503).json({ error: 'VOLANEA_WEBHOOK_SECRET is not configured' });
    return;
  }

  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  if (!verify(req.get('x-volanea-signature'), rawBody, secret)) {
    res.status(401).json({ error: 'bad signature' });
    return;
  }

  let payload: VolaneaEvent;
  try {
    payload = JSON.parse(rawBody.toString('utf8')) as VolaneaEvent;
  } catch {
    res.status(400).json({ error: 'invalid JSON' });
    return;
  }

  const recipient = payload.data?.to?.trim().toLowerCase();
  const kind = payload.event === 'email.complained' ? 'complained' : payload.event === 'email.bounced' ? 'bounced' : null;

  // Test deliveries prove the signature check; they carry no real recipient.
  if (payload.test || !kind || !recipient) {
    res.json({ ok: true, ignored: true });
    return;
  }

  const lead = await Lead.findOne({ email: recipient }).sort({ createdAt: -1 });
  if (lead) {
    const detail = typeof payload.data?.detail === 'string' ? ` (${payload.data.detail})` : '';
    lead.notificationError = `Buyer email ${kind}${detail} — contact them by phone`;
    await lead.save();
    logger.warn(`lead ${String(lead._id)}: buyer email ${kind}`);
  }
  res.json({ ok: true, matched: Boolean(lead) });
}));
