/**
 * Storage adapter interface (§5.1).
 *
 * Provider-specific code lives behind this. Swapping S3 for anything else means
 * writing a sibling file next to `local.ts` / `s3.ts` — never edits across the
 * codebase.
 */
export type PutObjectInput = {
  /** Deterministic key, e.g. `products/hcg-pregnancy/ifu.pdf` */
  key: string;
  body: Buffer;
  contentType: string;
  /** Gated files must never be publicly readable. */
  gated: boolean;
};

export type StoredObject = {
  key: string;
  size: number;
};

export interface StorageAdapter {
  readonly name: string;
  put(input: PutObjectInput): Promise<StoredObject>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  /** Stable URL for ungated assets (images). Never call this for gated files. */
  publicUrl(key: string): string;
  /**
   * Resolves a *verified* gated request into something the caller can hand back.
   * S3 returns a presigned redirect; local returns a stream.
   */
  resolveGated(key: string): Promise<
    { kind: 'redirect'; url: string } | { kind: 'stream'; stream: NodeJS.ReadableStream; size: number }
  >;
  /**
   * Moves an object between the readable and the gated stores when an editor
   * toggles gating. Without it the flag flips in Mongo and the bytes do not
   * move, so a document "locked" in the dashboard stays downloadable.
   */
  setGated(key: string, gated: boolean): Promise<void>;
}
