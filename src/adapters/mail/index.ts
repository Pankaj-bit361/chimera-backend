import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { fileMail } from './file.js';
import type { MailAdapter } from './types.js';
import { volaneaMail } from './volanea.js';

export type { MailAdapter, MailMessage, SentMail } from './types.js';

export const mail: MailAdapter = env.mail.driver === 'volanea' ? volaneaMail : fileMail;

logger.info(`mail adapter → ${mail.name} · domain ${env.mail.domain}`);
