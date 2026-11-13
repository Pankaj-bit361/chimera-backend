import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { fileMail } from './file.js';
import type { MailAdapter } from './types.js';
import { volaneaMail } from './volanea.js';
import { volaneaApiMail } from './volanea-api.js';

export type { MailAdapter, MailMessage, SentMail } from './types.js';

const ADAPTERS: Record<typeof env.mail.driver, MailAdapter> = {
  file: fileMail,
  volanea: volaneaMail,
  'volanea-api': volaneaApiMail,
};

export const mail: MailAdapter = ADAPTERS[env.mail.driver] ?? fileMail;

logger.info(`mail adapter → ${mail.name} · domain ${env.mail.domain}`);
