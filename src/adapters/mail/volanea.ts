import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import type { MailAdapter, MailMessage, SentMail } from './types.js';

/**
 * Volanea — in-house transactional email, spoken to over SMTP.
 *
 * Untested end-to-end: no Volanea credentials existed at build time. The
 * contract it implements is identical to the file driver, so switching is
 * `MAIL_DRIVER=volanea` plus the four VOLANEA_* vars.
 */
let transport: Transporter | null = null;

function transporter(): Transporter {
  if (transport) return transport;
  const { host, port, user, password, secure } = env.mail.volanea;
  if (!host) throw new Error('VOLANEA_HOST is not configured');
  transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass: password } : undefined,
  });
  return transport;
}

export const volaneaMail: MailAdapter = {
  name: 'volanea',

  async send(message: MailMessage): Promise<SentMail> {
    const info = await transporter().sendMail({
      from: `"${env.mail.fromName}" <no-reply@${env.mail.domain}>`,
      to: message.to,
      replyTo: message.replyTo,
      subject: message.subject,
      text: message.text,
      html: message.html,
      headers: message.tag ? { 'X-Chimera-Tag': message.tag } : undefined,
    });

    logger.info(`mail(volanea) → ${String(message.to)} · ${message.subject}`, {
      messageId: info.messageId,
    });
    return { id: info.messageId, accepted: info.accepted.map(String) };
  },
};
