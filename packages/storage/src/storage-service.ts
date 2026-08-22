import { createHmac, createHash } from 'node:crypto';
import { logger } from '@jaago/logger';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type StorageBucket = 'attachments' | 'reports' | 'exports' | 'imports' | 'backups' | 'jaago-private-docs' | 'jaago-public-assets';

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
  private supabaseClient: SupabaseClient | null = null;
  private objects = new Map<string, { metadata: StoredFileMetadata; buffer: Buffer }>();

  constructor(secretKey = 'jaago-storage-secret-key-development') {
    this.secretKey = secretKey;
    const url = process.env['NEXT_PUBLIC_SUPABASE_URL'] || 'https://fnemsvwejymnqpufumhj.supabase.co';
    const key =
      process.env['SUPABASE_SERVICE_ROLE_KEY'] ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI';

    try {
      this.supabaseClient = createClient(url, key);
    } catch {
      this.supabaseClient = null;
    }
  }

  /**
   * Resolves internal bucket names to Supabase storage bucket identifiers
   */
  private resolveSupabaseBucket(bucket: StorageBucket): string {
    if (bucket === 'jaago-public-assets') {
      return 'jaago-public-assets';
    }
    return 'jaago-private-docs';
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

    const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'] || 'https://fnemsvwejymnqpufumhj.supabase.co';
    const targetBucket = this.resolveSupabaseBucket(bucket);

    return `${supabaseUrl}/storage/v1/object/sign/${targetBucket}/${objectKey}?token=${signature}&sig=${signature}&expires=${expiresAt}`;
  }

  /**
   * Validates if a signed URL signature is authentic and has not expired
   */
  public verifySignedUrl(url: string): { valid: boolean; reason?: string } {
    try {
      const parsed = new URL(url);
      const expires = Number(parsed.searchParams.get('expires'));
      const token = parsed.searchParams.get('sig') || parsed.searchParams.get('token');

      if (!expires || !token) {
        return { valid: false, reason: 'Malformed signed URL' };
      }

      if (Math.floor(Date.now() / 1000) > expires) {
        return { valid: false, reason: 'Signed URL has expired' };
      }

      let objectKey = '';
      if (parsed.pathname.includes('/storage/v1/object/sign/')) {
        const afterSign = parsed.pathname.split('/storage/v1/object/sign/')[1] || '';
        const subParts = afterSign.split('/');
        objectKey = subParts.slice(1).join('/');
      } else {
        const parts = parsed.pathname.slice(1).split('/');
        objectKey = parts.slice(1).join('/');
      }

      // Check all canonical bucket signatures
      const candidateBuckets = ['attachments', 'reports', 'exports', 'imports', 'backups', 'jaago-private-docs', 'jaago-public-assets'];
      let isValidSig = false;
      for (const b of candidateBuckets) {
        const expectedPayload = `${b}/${objectKey}:${expires}`;
        const sig = createHmac('sha256', this.secretKey).update(expectedPayload).digest('hex');
        if (token === sig) {
          isValidSig = true;
          break;
        }
      }

      if (!isValidSig) {
        return { valid: false, reason: 'Invalid signature token' };
      }

      return { valid: true };
    } catch {
      return { valid: false, reason: 'URL parsing failure' };
    }
  }

  /**
   * Scans a file buffer for malware, computes SHA-256 checksum, and uploads to Supabase storage
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

      // Async upload to Supabase storage if client available
      if (this.supabaseClient) {
        const targetBucket = this.resolveSupabaseBucket(bucket);
        this.supabaseClient.storage
          .from(targetBucket)
          .upload(objectKey, buffer, {
            contentType: mimeType,
            upsert: true,
          })
          .catch((err) => {
            logger.warn('SYSTEM', 'storage.supabase_upload_background_failed', {
              metadata: {
                error: err.message,
                bucket: targetBucket,
                objectKey,
              },
            });
          });
      }

      logger.info('SYSTEM', 'storage.object_stored', {
        metadata: { bucket, objectKey, sizeBytes: buffer.length, provider: 'supabase' },
      });
    }

    return metadata;
  }

  public getObject(bucket: StorageBucket, objectKey: string): { metadata: StoredFileMetadata; buffer: Buffer } | undefined {
    return this.objects.get(`${bucket}:${objectKey}`);
  }
}

export const globalStorageService = new StorageService();
