import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import type { MailAdapter, MailMessage, SentMail } from './types.js';

const dir = path.resolve(process.cwd(), env.mail.localDir);

function toAddresses(to: string | string[]): string[] {
  return Array.isArray(to) ? to : [to];
}

function timestampSlug(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export const fileMail: MailAdapter = {
  name: 'file',

  async send(message: MailMessage): Promise<SentMail> {
    const id = randomUUID();
    const recipients = toAddresses(message.to);
    const from = `"${env.mail.fromName}" <no-reply@${env.mail.domain}>`;

    const headers = [
      `Message-ID: <${id}@${env.mail.domain}>`,
      `Date: ${new Date().toUTCString()}`,
      `From: ${from}`,
      `To: ${recipients.join(', ')}`,
      message.replyTo ? `Reply-To: ${message.replyTo}` : null,
      `Subject: ${message.subject}`,
      message.tag ? `X-Chimera-Tag: ${message.tag}` : null,
      'MIME-Version: 1.0',
      `Content-Type: ${message.html ? 'text/html' : 'text/plain'}; charset=utf-8`,
      '',
      message.html ?? message.text,
      '',
    ]
      .filter((line): line is string => line !== null)
      .join('\r\n');

    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${timestampSlug()}--${message.tag ?? 'mail'}--${id.slice(0, 8)}.eml`);
    await writeFile(file, headers, 'utf8');

    logger.info(`mail(file) → ${recipients.join(', ')} · ${message.subject}`, { file });
    return { id, accepted: recipients };
  },
};
