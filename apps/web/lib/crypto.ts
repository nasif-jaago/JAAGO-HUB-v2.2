import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const DEFAULT_KEY_ID = 'v1';

/**
 * Derives a consistent 32-byte encryption key from environment secret.
 */
function getEncryptionKey(keyId = DEFAULT_KEY_ID): Buffer {
  const rawSecret =
    process.env.EMAIL_CREDENTIALS_ENCRYPTION_KEY ||
    'jaago_hub_master_secret_key_2026_encryption_seed';

  // Hash the secret to ensure exactly 32 bytes for AES-256
  return crypto.createHash('sha256').update(`${rawSecret}:${keyId}`).digest();
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
  keyId: string;
}

/**
 * Encrypts plaintext string using AES-256-GCM with authentication tag.
 */
export function encryptCredential(plaintext: string, keyId = DEFAULT_KEY_ID): EncryptedData {
  if (!plaintext) {
    throw new Error('Plaintext is required for encryption');
  }

  const key = getEncryptionKey(keyId);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return {
    ciphertext,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    keyId,
  };
}

/**
 * Decrypts AES-256-GCM ciphertext using IV and authentication tag.
 */
export function decryptCredential(encrypted: {
  ciphertext: string;
  iv: string;
  tag: string;
  keyId?: string | undefined;
}): string {
  const { ciphertext, iv, tag, keyId = DEFAULT_KEY_ID } = encrypted;
  if (!ciphertext || !iv || !tag) {
    throw new Error('Ciphertext, IV, and Auth Tag are required for decryption');
  }

  const key = getEncryptionKey(keyId);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
