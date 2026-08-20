import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { PUBLISH_STATUSES, toJSONTransform } from './common.js';

/**
 * Certificate records (§7, §8.4).
 *
 * The audit's finding was that the old site claims ICMR/CDSCO with no numbers
 * and misspells DCGI. So: a certification cannot be published without a
 * `number` and a `certificateFile`. Text-only claims are rejected at the model
 * layer, not at review time.
 *
 * `--control` teal (§6.7 rule 03) is only rendered for records that pass this.
 */
const certificationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    issuer: { type: String, required: true, trim: true },
    number: { type: String, trim: true, default: '' },
    issuedOn: Date,
    validTill: Date,
    scope: { type: String, default: '' },
    certificateFile: { type: Schema.Types.ObjectId, ref: 'Media' },
    /**
     * Ticked by a human who has read the scanned certificate and confirmed the
     * number, issuer and validity match it. Nothing else may set this — it is
     * the evidence step, not a derived value. See the `verified` virtual.
     */
    checkedAgainstScan: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    status: { type: String, enum: PUBLISH_STATUSES, default: 'draft', index: true },
  },
  { timestamps: true, toJSON: toJSONTransform, toObject: toJSONTransform },
);

certificationSchema.pre('validate', function requireEvidenceToPublish(next) {
  const doc = this as unknown as {
    status: string;
    number?: string;
    certificateFile?: unknown;
    name?: string;
  };
  if (doc.status !== 'published') {
    next();
    return;
  }
  if (!doc.number?.trim()) {
    next(new Error(`"${doc.name}" cannot be published without a certificate number (§8.4)`));
    return;
  }
  if (!doc.certificateFile) {
    next(new Error(`"${doc.name}" cannot be published without a certificate image (§8.4)`));
    return;
  }
  next();
});

/**
 * Drives the teal stamp, and it has to mean what it says.
 *
 * Presence is not verification: a row can carry a number and a scan and still
 * be a placeholder — the seeded DEMO-0001 did exactly that and rendered as
 * verified, which is the failure DECISIONS.md D3 was written to prevent. So
 * the stamp needs all four: a human has ticked `checkedAgainstScan` after
 * reading the certificate, there is a number, there is a scan, and it has not
 * expired. Same discipline as a product's spec rows.
 */
certificationSchema.virtual('verified').get(function verified() {
  const doc = this as unknown as {
    number?: string;
    certificateFile?: unknown;
    validTill?: Date;
    checkedAgainstScan?: boolean;
  };
  const unexpired = !doc.validTill || doc.validTill.getTime() > Date.now();
  return Boolean(
    doc.checkedAgainstScan && doc.number?.trim() && doc.certificateFile && unexpired,
  );
});

export type CertificationAttrs = InferSchemaType<typeof certificationSchema>;
export type CertificationDoc = HydratedDocument<CertificationAttrs>;
export const Certification = model('Certification', certificationSchema);
