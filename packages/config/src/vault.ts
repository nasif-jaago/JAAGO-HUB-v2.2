import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';

export interface EncryptedSecretPayload {
  ciphertextHex: string;
  ivHex: string;
  authTagHex: string;
}

export class SecretVault {
  private masterKey: Buffer;

  constructor(masterSecret = 'jaago-vault-master-key-development-32-chars-long!') {
    // Derives 32-byte key using SHA-256
    this.masterKey = createHash('sha256').update(masterSecret).digest();
  }

  /**
   * Encrypts plaintext using AES-256-GCM authenticated encryption
   */
  public encrypt(plaintext: string): EncryptedSecretPayload {
    const iv = randomBytes(12); // Standard 12-byte (96-bit) IV for GCM
    const cipher = createCipheriv('aes-256-gcm', this.masterKey, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      ciphertextHex: ciphertext,
      ivHex: iv.toString('hex'),
      authTagHex: authTag.toString('hex'),
    };
  }

  /**
   * Decrypts ciphertext and verifies GCM authentication tag
   */
  public decrypt(payload: EncryptedSecretPayload): string {
    const iv = Buffer.from(payload.ivHex, 'hex');
    const authTag = Buffer.from(payload.authTagHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', this.masterKey, iv);

    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(payload.ciphertextHex, 'hex', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  }
}

export const globalSecretVault = new SecretVault();
