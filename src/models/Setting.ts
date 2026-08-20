import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { toJSONTransform } from './common.js';

/**
 * Site-wide NAP, socials, counters, banners (§7).
 *
 * Key/value rather than a singleton document so a new setting is a write, not a
 * migration. Known keys are listed in `SETTING_KEYS` for the dashboard form.
 */
const settingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: Schema.Types.Mixed },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: toJSONTransform, toObject: toJSONTransform },
);

export const SETTING_KEYS = {
  nap: 'nap',
  socials: 'socials',
  /** §6.7 rule 06 — every counter carries the page that evidences it. */
  homeCounters: 'homeCounters',
  banner: 'banner',
  whatsapp: 'whatsapp',
  businessHours: 'businessHours',
} as const;

export type SettingAttrs = InferSchemaType<typeof settingSchema>;
export type SettingDoc = HydratedDocument<SettingAttrs>;
export const Setting = model('Setting', settingSchema);
