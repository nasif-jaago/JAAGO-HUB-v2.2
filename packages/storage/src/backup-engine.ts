import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';

export interface BackupArchiveManifest {
  version: string;
  organizationId: string;
  databaseTables: Record<string, any[]>;
  storageObjectsCount: number;
  createdAt: string;
  checksumSha256: string;
}

export interface EncryptedBackupPackage {
  archiveName: string;
  ivHex: string;
  authTagHex: string;
  ciphertextHex: string;
  sizeBytes: number;
  checksumSha256: string;
}

export class BackupRestoreEngine {
  /**
   * Creates an AES-256-GCM encrypted backup archive package
   */
  public static createEncryptedBackup(
    organizationId: string,
    tables: Record<string, any[]>,
    storageObjectsCount: number,
    encryptionSecret = 'jaago-backup-secret-key-32-chars-development!',
  ): EncryptedBackupPackage {
    const key = createHash('sha256').update(encryptionSecret).digest();
    const manifestWithoutChecksum: Omit<BackupArchiveManifest, 'checksumSha256'> = {
      version: '2.2.0',
      organizationId,
      databaseTables: tables,
      storageObjectsCount,
      createdAt: new Date().toISOString(),
    };

    const rawData = JSON.stringify(manifestWithoutChecksum);
    const checksumSha256 = createHash('sha256').update(rawData).digest('hex');

    const fullManifest: BackupArchiveManifest = {
      ...manifestWithoutChecksum,
      checksumSha256,
    };

    const plaintext = JSON.stringify(fullManifest);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    const archiveName = `jaago_backup_${organizationId}_${Date.now()}.tar.enc`;

    return {
      archiveName,
      ivHex: iv.toString('hex'),
      authTagHex: authTag.toString('hex'),
      ciphertextHex: ciphertext,
      sizeBytes: Buffer.byteLength(ciphertext, 'hex'),
      checksumSha256,
    };
  }

  /**
   * Verifies and decrypts backup package during disaster recovery drill
   */
  public static verifyAndRestoreDrill(
    pkg: EncryptedBackupPackage,
    encryptionSecret = 'jaago-backup-secret-key-32-chars-development!',
  ): {
    valid: boolean;
    manifest?: BackupArchiveManifest;
    tablesRestored: number;
    error?: string;
  } {
    try {
      const key = createHash('sha256').update(encryptionSecret).digest();
      const iv = Buffer.from(pkg.ivHex, 'hex');
      const authTag = Buffer.from(pkg.authTagHex, 'hex');

      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      let plaintext = decipher.update(pkg.ciphertextHex, 'hex', 'utf8');
      plaintext += decipher.final('utf8');

      const manifest = JSON.parse(plaintext) as BackupArchiveManifest;

      // Checksum integrity check
      const { checksumSha256, ...rest } = manifest;
      const computedChecksum = createHash('sha256').update(JSON.stringify(rest)).digest('hex');

      if (computedChecksum !== checksumSha256) {
        return { valid: false, error: 'Backup archive checksum integrity mismatch', tablesRestored: 0 };
      }

      const tableCount = Object.keys(manifest.databaseTables || {}).length;

      return {
        valid: true,
        manifest,
        tablesRestored: tableCount,
      };
    } catch (err: any) {
      return { valid: false, error: `Decryption or restore drill failed: ${err.message}`, tablesRestored: 0 };
    }
  }
}
