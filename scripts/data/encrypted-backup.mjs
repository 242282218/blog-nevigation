import { createCipheriv, createDecipheriv, createHash, scryptSync, randomBytes } from 'node:crypto';

const ENCRYPTED_BACKUP_VERSION = 1;
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const CURRENT_KEY_DERIVATION = 'scrypt';
const SUPPORTED_KEY_DERIVATIONS = ['sha256', 'scrypt'];
const KEY_DERIVATION_SALT = 'blog-navigation-backup-v1';
const KEY_LENGTH = 32;

function deriveKey(secret, method = CURRENT_KEY_DERIVATION) {
  if (method === 'scrypt') {
    return scryptSync(secret, KEY_DERIVATION_SALT, KEY_LENGTH);
  }

  return createHash('sha256').update(secret, 'utf8').digest();
}

export function getBackupEncryptionSecret() {
  return process.env.GITHUB_BACKUP_ENCRYPTION_KEY || process.env.BACKUP_ENCRYPTION_KEY || '';
}

export function createEncryptedBackupPayload(backupPayload, secret) {
  if (!secret) {
    throw new Error('GITHUB_BACKUP_ENCRYPTION_KEY or BACKUP_ENCRYPTION_KEY is required.');
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, deriveKey(secret), iv);
  const plaintext = Buffer.from(JSON.stringify(backupPayload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  return {
    version: ENCRYPTED_BACKUP_VERSION,
    algorithm: ENCRYPTION_ALGORITHM,
    keyDerivation: CURRENT_KEY_DERIVATION,
    encryptedAt: new Date().toISOString(),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    ciphertext: encrypted.toString('base64'),
  };
}

export function decryptBackupPayload(encryptedPayload, secret) {
  if (!secret) {
    throw new Error('GITHUB_BACKUP_ENCRYPTION_KEY or BACKUP_ENCRYPTION_KEY is required.');
  }

  if (
    !encryptedPayload ||
    encryptedPayload.version !== ENCRYPTED_BACKUP_VERSION ||
    encryptedPayload.algorithm !== ENCRYPTION_ALGORITHM ||
    !SUPPORTED_KEY_DERIVATIONS.includes(encryptedPayload.keyDerivation) ||
    typeof encryptedPayload.iv !== 'string' ||
    typeof encryptedPayload.authTag !== 'string' ||
    typeof encryptedPayload.ciphertext !== 'string'
  ) {
    throw new Error('Encrypted backup payload is invalid.');
  }

  const decipher = createDecipheriv(
    ENCRYPTION_ALGORITHM,
    deriveKey(secret, encryptedPayload.keyDerivation),
    Buffer.from(encryptedPayload.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(encryptedPayload.authTag, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPayload.ciphertext, 'base64')),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString('utf8'));
}
