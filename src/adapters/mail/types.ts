/**
 * Mail adapter interface (§5.1).
 *
 * Volanea is the in-house transactional sender. The file driver writes RFC-822
 * `.eml` files to disk so the whole lead-routing path is exercisable locally
 * with no credentials and no risk of mailing a real buyer from a dev machine.
 */
export type MailMessage = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  /** Tag used for log correlation, e.g. `lead:distributor`. */
  tag?: string;
};

export type SentMail = {
  id: string;
  accepted: string[];
};

export interface MailAdapter {
  readonly name: string;
  send(message: MailMessage): Promise<SentMail>;
}
