import { env } from '../../config/env.js';
import { ok, type Result } from '../../lib/http.js';
import { revalidate } from '../../lib/revalidate.js';
import { Setting } from '../../models/Setting.js';
import { settingInput } from '../../validation/schemas.js';

/**
 * Site-wide settings (§7, §9 8.5).
 *
 * Returned as one flat object because the site's layout needs all of it on
 * every render — NAP in the footer, WhatsApp in the header, counters on home.
 */
export async function getPublicSettings(): Promise<Result<unknown>> {
  const settings = await Setting.find();
  const map = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));

  return ok({
    ...map,
    /** Config the site needs but never stores: D5's pricing mode and the domain. */
    pricingMode: env.pricingMode,
    inboxes: env.mail.inboxes,
  });
}

export async function listSettings(): Promise<Result<unknown>> {
  const settings = await Setting.find().sort({ key: 1 });
  return ok({ items: settings.map((setting) => setting.toJSON()) });
}

export async function upsertSetting(key: string, body: unknown, userId: string): Promise<Result<unknown>> {
  const input = settingInput.parse(body);
  const setting = await Setting.findOneAndUpdate(
    { key },
    { key, value: input.value, updatedBy: userId },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  // NAP, counters and the banner all appear in the layout — rebuild everything.
  await revalidate(['/', '/contact', '/about', '/products']);
  return ok(setting!.toJSON());
}
