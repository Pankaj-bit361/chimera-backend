import { env } from '../../config/env.js';
import { storage } from '../../adapters/storage/index.js';
import {
  DOCUMENT_KIND_LABELS,
  SPEC_GROUPS,
  SPEC_GROUP_LABELS,
  type DocumentKind,
  type SpecGroup,
} from '../../models/common.js';

/**
 * Shapes documents for the public API.
 *
 * The single rule this file exists to guarantee: **a gated file never leaves
 * here with a URL on it.** The public payload carries the media id and a
 * `gated: true` flag; the only way to a byte of that file is through the
 * document-request funnel, which creates a Lead first (§9 8.2).
 */

type MediaLike = {
  _id: unknown;
  kind: string;
  storageKey: string;
  mime: string;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  gated?: boolean | null;
  size?: number | null;
} | null | undefined;

export function presentImage(media: MediaLike) {
  if (!media) return null;
  return {
    id: String(media._id),
    url: media.gated ? null : storage.publicUrl(media.storageKey),
    alt: media.alt ?? '',
    width: media.width ?? null,
    height: media.height ?? null,
    mime: media.mime,
  };
}

export function presentDocument(input: { kind: DocumentKind; label?: string | null; media: MediaLike }) {
  const { media } = input;
  if (!media) return null;
  const gated = Boolean(media.gated);
  return {
    id: String(media._id),
    kind: input.kind,
    label: input.label || DOCUMENT_KIND_LABELS[input.kind],
    gated,
    /** Present only for ungated files. Gated files are requested, not linked. */
    url: gated ? null : storage.publicUrl(media.storageKey),
    sizeBytes: media.size ?? null,
    mime: media.mime,
  };
}

type SpecLike = {
  slug: string;
  label: string;
  value: string;
  unit?: string | null;
  group?: string | null;
  order?: number | null;
  key?: boolean | null;
  verified?: boolean | null;
};

export type PresentedSpecGroup = {
  group: SpecGroup;
  label: string;
  rows: Array<{
    slug: string;
    label: string;
    value: string;
    unit: string;
    key: boolean;
    verified: boolean;
  }>;
};

/**
 * Groups spec rows into the Readout's three sections (§6.5).
 * One data structure, three outputs: the panel, the JSON-LD, the PDF spec sheet.
 */
export function presentSpecs(specs: SpecLike[] = []): PresentedSpecGroup[] {
  return SPEC_GROUPS.map((group) => ({
    group,
    label: SPEC_GROUP_LABELS[group],
    rows: specs
      .filter((spec) => (spec.group ?? 'performance') === group)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((spec) => ({
        slug: spec.slug,
        label: spec.label,
        value: spec.value,
        unit: spec.unit ?? '',
        key: Boolean(spec.key),
        verified: Boolean(spec.verified),
      })),
  })).filter((section) => section.rows.length > 0);
}

type PackLike = {
  label: string;
  tests?: number | null;
  sku: string;
  hsn?: string | null;
  moq?: number | null;
  indicativePrice?: number | null;
  currency?: string | null;
  order?: number | null;
};

/**
 * D5 — quote-only by default. In `quote` mode the price field is stripped here,
 * server-side, so no build of the site can accidentally render it.
 */
export function presentPackSizes(packs: PackLike[] = []) {
  return [...packs]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((pack) => ({
      label: pack.label,
      tests: pack.tests ?? null,
      sku: pack.sku,
      hsn: pack.hsn ?? '',
      moq: pack.moq ?? 1,
      indicativePrice:
        env.pricingMode === 'indicative' && pack.indicativePrice != null ? pack.indicativePrice : null,
      currency: pack.currency ?? 'INR',
    }));
}
