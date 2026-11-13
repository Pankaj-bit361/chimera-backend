import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import type { MailAdapter, MailMessage, SentMail } from './types.js';

/**
 * Volanea over its REST API (`POST /v1/send`), selected by
 * `MAIL_DRIVER=volanea-api` plus `VOLANEA_API_KEY`.
 *
 * The API has no CC field, and every address in `to` gets its own message,
 * so `cc` recipients are appended to `to` and each receives a separate copy.
 * A 200 can still skip a recipient (suppressed, over quota…); the send only
 * fails when nobody was accepted.
 */
type SendResult = { id?: string; to: string; status?: string; skipped?: string };
type ApiBody<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string; details?: Array<{ code: string }> }
  | null;

/**
 * Volanea substitutes {{variables}} into the HTML verbatim. Every value here
 * comes from a public form, so it is escaped before it leaves — otherwise a
 * buyer could put markup or a link into the email the sales team opens.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeVariables(variables: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(variables).map(([key, value]) => [key, escapeHtml(value)]));
}

async function call<T>(path: string, payload: unknown): Promise<T> {
  const { apiUrl, apiKey } = env.mail.volanea;
  if (!apiKey) throw new Error('VOLANEA_API_KEY is not configured');

  const response = await fetch(`${apiUrl.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => null)) as ApiBody<T>;

  if (!response.ok || !body?.success) {
    const reason = body && !body.success
      ? `${body.code}${body.details?.[0]?.code ? `/${body.details[0].code}` : ''}: ${body.error}`
      : `HTTP ${response.status}`;
    throw new Error(`Volanea ${path} failed — ${reason}`);
  }
  return body.data;
}

export const volaneaApiMail: MailAdapter = {
  name: 'volanea-api',

  async send(message: MailMessage): Promise<SentMail> {
    const to = [...(Array.isArray(message.to) ? message.to : [message.to]), ...(message.cc ?? [])];
    const content = message.template
      ? { templateId: message.template.id, variables: escapeVariables(message.template.variables) }
      : { text: message.text, html: message.html };

    const data = await call<{ messages: SendResult[] }>('/v1/send', {
      to,
      from: `no-reply@${env.mail.domain}`,
      fromName: env.mail.fromName,
      replyTo: message.replyTo,
      // Built in code from plain text, so it overrides the template's subject.
      subject: message.subject,
      ...content,
      headers: message.tag ? { 'X-Chimera-Tag': message.tag } : undefined,
      createContact: false,
    });

    const accepted = data.messages.filter((result) => result.id);
    const skipped = data.messages.filter((result) => result.skipped);
    if (skipped.length) {
      logger.warn(`mail(volanea-api) skipped ${skipped.map((s) => `${s.to}:${s.skipped}`).join(', ')}`);
    }
    if (!accepted.length) throw new Error(`Volanea accepted no recipients for "${message.subject}"`);

    logger.info(`mail(volanea-api) → ${accepted.map((a) => a.to).join(', ')} · ${message.subject}`, {
      ids: accepted.map((a) => a.id),
    });
    return { id: String(accepted[0]?.id), accepted: accepted.map((a) => a.to) };
  },
};

/**
 * Records a product event (`POST /v1/events`) so Volanea workflows can react,
 * e.g. `lead.quote` starts the 3-day quote follow-up. A no-op unless the
 * volanea-api driver is on; never throws, because a lead is already saved and
 * notified by the time this runs.
 */
export async function trackVolaneaEvent(input: {
  name: string;
  email: string;
  data: Record<string, string>;
  firstName?: string;
}): Promise<void> {
  if (env.mail.driver !== 'volanea-api') return;
  try {
    await call('/v1/events', {
      name: input.name,
      email: input.email,
      data: escapeVariables(input.data),
      contact: input.firstName ? { firstName: escapeHtml(input.firstName) } : undefined,
    });
  } catch (error) {
    logger.error(`volanea event ${input.name} failed`, error);
  }
}
