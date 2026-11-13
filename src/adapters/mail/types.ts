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
  /** Copied recipients. The Volanea API has no CC, so there each gets its own copy. */
  cc?: string[];
  /**
   * A stored Volanea template to render instead of `text`. Only the volanea-api
   * driver uses it; the file and SMTP drivers keep sending `text`, so `text`
   * must always be a complete message on its own.
   */
  template?: { id: string; variables: Record<string, string> };
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
