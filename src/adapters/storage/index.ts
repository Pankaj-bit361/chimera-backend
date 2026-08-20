import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { localStorage } from './local.js';
import { s3Storage } from './s3.js';
import type { StorageAdapter } from './types.js';

export type { StorageAdapter, PutObjectInput, StoredObject } from './types.js';

export const storage: StorageAdapter = env.storage.driver === 's3' ? s3Storage : localStorage;

logger.info(`storage adapter → ${storage.name}`);
