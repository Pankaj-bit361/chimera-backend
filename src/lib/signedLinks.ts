import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Signed expiring links for gated documents (§9 8.2, §12).
 *
 * The token is stateless: `mediaId.leadId.expiry.signature`. No DB lookup is
 * needed to reject a tampered or stale link, and revoking early is a matter of
 * rotating DOCUMENT_LINK_SECRET.
 *
 * Deliberately *not* the JWT secret — a leaked download link must never be
 * upgradeable into a dashboard session.
 */
export type DocumentLinkClaims = {
  mediaId: string;
  leadId: string;
};

function sign(body: string): string {
  return createHmac('sha256', env.documentLinkSecret).update(body).digest('base64url');
}

export function createDocumentToken(
  claims: DocumentLinkClaims,
  ttlMinutes = env.documentLinkTtlMinutes,
): { token: string; expiresAt: Date } {
  const expiry = Date.now() + ttlMinutes * 60_000;
  const body = `${claims.mediaId}.${claims.leadId}.${expiry}`;
  return { token: `${body}.${sign(body)}`, expiresAt: new Date(expiry) };
}

export type VerifyResult =
  | { ok: true; claims: DocumentLinkClaims }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' };

export function verifyDocumentToken(token: string): VerifyResult {
  const parts = token.split('.');
  if (parts.length !== 4) return { ok: false, reason: 'malformed' };

  const [mediaId, leadId, expiryRaw, signature] = parts as [string, string, string, string];
  const body = `${mediaId}.${leadId}.${expiryRaw}`;

  const expected = Buffer.from(sign(body));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return { ok: false, reason: 'bad_signature' };
  }

  const expiry = Number.parseInt(expiryRaw, 10);
  if (!Number.isFinite(expiry)) return { ok: false, reason: 'malformed' };
  if (expiry < Date.now()) return { ok: false, reason: 'expired' };

  return { ok: true, claims: { mediaId, leadId } };
}

export function documentDownloadUrl(token: string, apiBaseUrl: string): string {
  return `${apiBaseUrl.replace(/\/$/, '')}/api/documents/download/${token}`;
}
