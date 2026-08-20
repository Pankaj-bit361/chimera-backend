import { storage } from '../../adapters/storage/index.js';
import { created, noContent, notFound, ok, type Result } from '../../lib/http.js';
import { revalidate } from '../../lib/revalidate.js';
import { Certification, type CertificationDoc } from '../../models/Certification.js';
import { certificationInput } from '../../validation/schemas.js';

/**
 * §8.4 — "Text-only claims are not acceptable."
 *
 * The public endpoint returns only records that carry a number *and* a
 * certificate image, because those are the only ones the site is allowed to
 * render with the teal verified stamp (§6.7 rule 03).
 */
const CERT_PATHS = ['/about/certifications', '/about', '/'];

function presentPublic(cert: CertificationDoc) {
  const file = cert.certificateFile as unknown as { storageKey: string; alt?: string; mime: string } | null;
  return {
    id: String(cert._id),
    name: cert.name,
    issuer: cert.issuer,
    number: cert.number,
    issuedOn: cert.issuedOn,
    validTill: cert.validTill,
    scope: cert.scope,
    /**
     * The teal stamp's only source of truth. The model computes it (number +
     * scanned certificate + unexpired) but the public payload never carried
     * it, so the site had nothing to render from and hardcoded the stamp —
     * which meant a placeholder like DEMO-0001 displayed as verified.
     */
    verified: Boolean((cert as unknown as { verified?: boolean }).verified),
    certificate: file
      ? { url: storage.publicUrl(file.storageKey), alt: file.alt ?? `${cert.name} certificate`, mime: file.mime }
      : null,
  };
}

export async function listPublicCertifications(): Promise<Result<unknown>> {
  const certs = await Certification.find({ status: 'published' })
    .sort({ order: 1, name: 1 })
    .populate('certificateFile');

  return ok({
    items: certs
      .filter((cert) => cert.number?.trim() && cert.certificateFile)
      .map(presentPublic),
  });
}

export async function listCertifications(): Promise<Result<unknown>> {
  const certs = await Certification.find().sort({ order: 1, name: 1 }).populate('certificateFile');
  return ok({
    items: certs.map((cert) => ({
      ...cert.toJSON(),
      certificateUrl: cert.certificateFile
        ? storage.publicUrl((cert.certificateFile as unknown as { storageKey: string }).storageKey)
        : null,
    })),
  });
}

export async function createCertification(body: unknown): Promise<Result<unknown>> {
  const input = certificationInput.parse(body);
  const cert = await Certification.create(input);
  await revalidate(CERT_PATHS);
  return created(cert.toJSON());
}

export async function updateCertification(id: string, body: unknown): Promise<Result<unknown>> {
  const input = certificationInput.partial().parse(body);
  const cert = await Certification.findById(id);
  if (!cert) return notFound('Certification not found');
  Object.assign(cert, input);
  await cert.save(); // model-level pre-validate rejects publishing without evidence
  await revalidate(CERT_PATHS);
  return ok(cert.toJSON());
}

export async function deleteCertification(id: string): Promise<Result<unknown>> {
  const cert = await Certification.findByIdAndDelete(id);
  if (!cert) return notFound('Certification not found');
  await revalidate(CERT_PATHS);
  return noContent();
}
