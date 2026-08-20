import { env } from '../../config/env.js';
import type { LeadType } from '../../models/common.js';

/**
 * §9 8.3 — three inboxes, routed by form type and country.
 *
 * | Inbox      | Receives                                                      |
 * |------------|---------------------------------------------------------------|
 * | `info@`    | General contact, careers                                       |
 * | `sales@`   | Quotes and samples from India, distributor applications        |
 * | `exports@` | Everything where country ≠ India, OEM                          |
 *
 * Pure function: type + country in, addresses out. The one piece of logic that
 * determines whether a lead reaches a human, so it is kept separate from
 * transport, template and persistence.
 */
export type Inbox = 'info' | 'sales' | 'exports';

const INDIA = new Set(['india', 'in', 'bharat']);

export function isDomestic(country: string | undefined): boolean {
  if (!country) return true; // absent country on a domestic-first site means India
  return INDIA.has(country.trim().toLowerCase());
}

export function inboxesFor(type: LeadType, country: string | undefined): Inbox[] {
  const domestic = isDomestic(country);

  switch (type) {
    case 'contact':
    case 'career':
      return ['info'];

    case 'oem':
      // OEM is an export-desk motion regardless of where the brand sits.
      return domestic ? ['exports', 'sales'] : ['exports'];

    case 'distributor':
      return domestic ? ['sales'] : ['exports', 'sales'];

    case 'quote':
    case 'document':
      return domestic ? ['sales'] : ['exports'];

    default:
      return ['info'];
  }
}

export function addressesFor(type: LeadType, country: string | undefined): string[] {
  return inboxesFor(type, country).map((inbox) => env.mail.inboxes[inbox]);
}
