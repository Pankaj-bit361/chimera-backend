import { createReadStream } from 'node:fs';
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env.js';
import type { PutObjectInput, StorageAdapter, StoredObject } from './types.js';

/**
 * Disk-backed storage for local development — no AWS account required.
 *
 * ── Why there are two roots ─────────────────────────────────────────────────
 * `publicRoot` is mounted by Express at /uploads. `privateRoot` is not mounted
 * anywhere and must never be. Gated objects — every IFU, COA and MSDS — are
 * written to `privateRoot`, so the only way to read one is through
 * `resolveGated()`, which the download route calls *after* it has verified the
 * HMAC-signed link and recorded the lead.
 *
 * Both roots previously were one root, and that root was statically served:
 * `GET /uploads/documents/ifu/<slug>-ifu.pdf` returned the PDF with no lead,
 * no token and no signature, which defeated the entire gated-download
 * mechanism the product is built around. Keeping gated bytes outside the
 * served tree makes that class of bug structurally impossible rather than a
 * matter of getting a route guard right.
 */
const publicRoot = path.resolve(process.cwd(), env.storage.localDir);
const privateRoot = path.resolve(publicRoot, '..', 'private');

function resolveIn(root: string, key: string): string {
  const target = path.resolve(root, key);
  // Refuse anything that escapes its root.
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error(`Illegal storage key: ${key}`);
  }
  return target;
}

/** Private first: a gated object must never be found in the served tree. */
async function locate(key: string): Promise<string | null> {
  for (const root of [privateRoot, publicRoot]) {
    const target = resolveIn(root, key);
    try {
      await stat(target);
      return target;
    } catch {
      /* try the next root */
    }
  }
  return null;
}

export const localStorage: StorageAdapter = {
  name: 'local',

  async put({ key, body, contentType, gated }: PutObjectInput): Promise<StoredObject> {
    void contentType;
    const target = resolveIn(gated ? privateRoot : publicRoot, key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body);

    // A file that changes gating must not be left behind in the other tree —
    // that is exactly how a document becomes public again after being locked.
    const stale = resolveIn(gated ? publicRoot : privateRoot, key);
    await rm(stale, { force: true });

    return { key, size: body.byteLength };
  },

  async delete(key) {
    await Promise.all([
      rm(resolveIn(publicRoot, key), { force: true }),
      rm(resolveIn(privateRoot, key), { force: true }),
    ]);
  },

  async exists(key) {
    return (await locate(key)) !== null;
  },

  publicUrl(key) {
    return `${env.storage.localPublicUrl.replace(/\/$/, '')}/${key.replace(/^\//, '')}`;
  },

  async resolveGated(key) {
    const target = await locate(key);
    if (!target) throw new Error(`Missing gated object: ${key}`);
    const info = await stat(target);
    return { kind: 'stream', stream: createReadStream(target), size: info.size };
  },

  /**
   * Moves an object between the served and unserved trees when an editor
   * toggles `gated` in the dashboard. Without this the flag changes in Mongo
   * and the bytes stay exactly where they were.
   */
  async setGated(key: string, gated: boolean) {
    const from = resolveIn(gated ? publicRoot : privateRoot, key);
    const to = resolveIn(gated ? privateRoot : publicRoot, key);
    try {
      await stat(from);
    } catch {
      return; // already on the right side, or gone
    }
    await mkdir(path.dirname(to), { recursive: true });
    await rename(from, to);
  },
};
