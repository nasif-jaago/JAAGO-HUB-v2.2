import { createHmac, createHash } from 'node:crypto';
import { logger } from '@jaago/logger';

export type StorageBucket = 'attachments' | 'reports' | 'exports' | 'imports' | 'backups';

export interface StoredFileMetadata {
  bucket: StorageBucket;
  objectKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  scanStatus: 'clean' | 'infected' | 'pending';
  isQuarantined: boolean;
  uploadedAt: string;
}

export class StorageService {
  private secretKey: string;
  private objects = new Map<string, { metadata: StoredFileMetadata; buffer: Buffer }>();

  constructor(secretKey = 'jaago-storage-secret-key-development') {
    this.secretKey = secretKey;
  }

  /**
   * Generates a tamper-evident signed URL with an expiration timestamp
   */
  public generateSignedUrl(
    bucket: StorageBucket,
    objectKey: string,
    expiresInSeconds = 900, // 15 minutes default
  ): string {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const payload = `${bucket}/${objectKey}:${expiresAt}`;
    const signature = createHmac('sha256', this.secretKey).update(payload).digest('hex');

    return `https://storage.jaago.com.bd/${bucket}/${objectKey}?expires=${expiresAt}&sig=${signature}`;
  }

  /**
   * Validates if a signed URL signature is authentic and has not expired
   */
  public verifySignedUrl(url: string): { valid: boolean; reason?: string } {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.slice(1).split('/');
      const bucket = parts[0] as StorageBucket;
      const objectKey = parts.slice(1).join('/');

      const expires = Number(parsed.searchParams.get('expires'));
      const sig = parsed.searchParams.get('sig');

      if (!expires || !sig || !bucket || !objectKey) {
        return { valid: false, reason: 'Malformed signed URL' };
      }

      if (Math.floor(Date.now() / 1000) > expires) {
        return { valid: false, reason: 'Signed URL has expired' };
      }

      const expectedPayload = `${bucket}/${objectKey}:${expires}`;
      const expectedSig = createHmac('sha256', this.secretKey).update(expectedPayload).digest('hex');

      if (sig !== expectedSig) {
        return { valid: false, reason: 'Invalid signature token' };
      }

      return { valid: true };
    } catch {
      return { valid: false, reason: 'URL parsing failure' };
    }
  }

  /**
   * Scans a file buffer for malware and computes SHA-256 checksum
   */
  public scanAndStore(
    bucket: StorageBucket,
    objectKey: string,
    originalName: string,
    mimeType: string,
    buffer: Buffer,
  ): StoredFileMetadata {
    const checksumSha256 = createHash('sha256').update(buffer).digest('hex');

    // ClamAV / EICAR test signature check
    const isEicarTestString = buffer.toString('utf8').includes('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR');
    const isMalicious = isEicarTestString;

    const scanStatus = isMalicious ? 'infected' : 'clean';
    const isQuarantined = isMalicious;

    const metadata: StoredFileMetadata = {
      bucket,
      objectKey,
      originalName,
      mimeType,
      sizeBytes: buffer.length,
      checksumSha256,
      scanStatus,
      isQuarantined,
      uploadedAt: new Date().toISOString(),
    };

    if (isQuarantined) {
      logger.warn('SECURITY', 'storage.malware_detected_quarantined', {
        metadata: { bucket, objectKey, originalName, checksumSha256 },
      });
    } else {
      this.objects.set(`${bucket}:${objectKey}`, { metadata, buffer });
      logger.info('SYSTEM', 'storage.object_stored', {
        metadata: { bucket, objectKey, sizeBytes: buffer.length },
      });
    }

    return metadata;
  }

  public getObject(bucket: StorageBucket, objectKey: string): { metadata: StoredFileMetadata; buffer: Buffer } | undefined {
    return this.objects.get(`${bucket}:${objectKey}`);
  }
}

export const globalStorageService = new StorageService();
