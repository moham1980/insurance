import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer | undefined {
  const raw = process.env.PII_ENCRYPTION_KEY;
  if (!raw) return undefined;
  return crypto.createHash('sha256').update(raw).digest();
}

export const piiFieldTransformer = {
  from(value: string | null): string | null {
    if (value === null || value === undefined || value === '') return value;
    const key = getKey();
    if (!key) {
      throw new Error('PII_ENCRYPTION_KEY is required to decrypt nationalId');
    }

    try {
      const parts = value.split(':');
      if (parts.length !== 3) return '[encrypted]';
      const [ivHex, authTagHex, encryptedHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decrypted.toString('utf8');
    } catch (err) {
      console.error('Failed to decrypt PII field', err);
      return '[decryption-error]';
    }
  },

  to(value: string | null): string | null {
    if (value === null || value === undefined || value === '') return value;
    const key = getKey();
    if (!key) {
      throw new Error('PII_ENCRYPTION_KEY is required to encrypt nationalId');
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  },
};
