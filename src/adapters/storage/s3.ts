import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectAclCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env.js';
import type { PutObjectInput, StorageAdapter, StoredObject } from './types.js';

/**
 * S3 (ap-south-1) — production storage.
 *
 * Gated objects are written private and only ever reached through a presigned
 * URL minted after the download lead has been recorded. Ungated objects are
 * public-read so Next.js can serve them straight from the bucket or a CDN.
 */
let client: S3Client | null = null;

function s3(): S3Client {
  if (client) return client;
  if (!env.storage.s3Bucket) throw new Error('S3_BUCKET is not configured');
  client = new S3Client({
    region: env.storage.s3Region,
    credentials:
      env.storage.s3AccessKeyId && env.storage.s3SecretAccessKey
        ? {
            accessKeyId: env.storage.s3AccessKeyId,
            secretAccessKey: env.storage.s3SecretAccessKey,
          }
        : undefined, // fall back to the instance role
  });
  return client;
}

export const s3Storage: StorageAdapter = {
  name: 's3',

  async put({ key, body, contentType, gated }: PutObjectInput): Promise<StoredObject> {
    await s3().send(
      new PutObjectCommand({
        Bucket: env.storage.s3Bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: gated ? 'private' : 'public-read',
        CacheControl: gated ? 'no-store' : 'public, max-age=31536000, immutable',
      }),
    );
    return { key, size: body.byteLength };
  },

  async delete(key) {
    await s3().send(new DeleteObjectCommand({ Bucket: env.storage.s3Bucket, Key: key }));
  },

  async exists(key) {
    try {
      await s3().send(new HeadObjectCommand({ Bucket: env.storage.s3Bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  },

  publicUrl(key) {
    const base =
      env.storage.s3PublicUrl ||
      `https://${env.storage.s3Bucket}.s3.${env.storage.s3Region}.amazonaws.com`;
    return `${base.replace(/\/$/, '')}/${key.replace(/^\//, '')}`;
  },

  async resolveGated(key) {
    const url = await getSignedUrl(
      s3(),
      new GetObjectCommand({ Bucket: env.storage.s3Bucket, Key: key }),
      { expiresIn: 300 },
    );
    return { kind: 'redirect', url };
  },

  /**
   * Rewrites the object ACL when an editor toggles gating. The bucket is
   * private by default and gated reads go through a presigned URL, so this
   * only has to strip or restore public-read; the key never moves.
   */
  async setGated(key, gated) {
    await s3().send(
      new PutObjectAclCommand({
        Bucket: env.storage.s3Bucket,
        Key: key,
        ACL: gated ? 'private' : 'public-read',
      }),
    );
  },
};
