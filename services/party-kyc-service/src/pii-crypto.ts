import * as crypto from 'crypto';

const KEY_LEN = 32;
const IV_LEN = 16;
const TAG_LEN = 16;

function getKey(envName: string): Buffer {
  const raw = process.env[envName];
  if (!raw || raw.length < KEY_LEN) {
    throw new Error(`${envName} must be set and at least ${KEY_LEN} bytes`);
  }
  return Buffer.from(raw.padEnd(KEY_LEN, '0').substring(0, KEY_LEN), 'utf8');
}

export function getEncryptionKey(): Buffer {
  return getKey('FIELD_ENCRYPTION_KEY');
}

export function getBlindIndexKey(): Buffer {
  const raw = process.env['FIELD_BLIND_INDEX_KEY'];
  if (raw && raw.length >= KEY_LEN) {
    return Buffer.from(raw.padEnd(KEY_LEN, '0').substring(0, KEY_LEN), 'utf8');
  }
  // Derive blind-index key from encryption key as fallback (not ideal, but ok for migration)
  const encKey = getEncryptionKey();
  return crypto.createHmac('sha256', encKey).update('blind-index').digest();
}

export function normalizeNationalId(value: string): string {
  if (!value) return '';
  // Persian/Arabic digits to ASCII, trim, remove non-digits, strip leading zeros
  return value
    .replace(/[\u06F0-\u06F9]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1728))
    .replace(/[\u0660-\u0669]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1584))
    .replace(/\D/g, '')
    .replace(/^0+/, '')
    .trim();
}

export function blindIndex(value: string): string {
  const key = getBlindIndexKey();
  const normalized = normalizeNationalId(value);
  return crypto.createHmac('sha256', key).update(normalized).digest('hex');
}

export function encryptAead(plaintext: string, keyVersion = 'v1'): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${keyVersion}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

export function decryptAead(ciphertext: string): string {
  if (!ciphertext || typeof ciphertext !== 'string') return ciphertext;
  const parts = ciphertext.split(':');
  if (parts.length !== 4) {
    // Legacy CBC fallback: try old decrypt
    return decryptLegacy(ciphertext);
  }
  const [version, ivHex, tagHex, encrypted] = parts;
  if (version !== 'v1') throw new Error(`Unsupported encryption version: ${version}`);
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function decryptLegacy(value: string): string {
  // AES-256-CBC old format: iv:encrypted
  if (!value.includes(':')) return value;
  try {
    const key = getEncryptionKey();
    const keyBuf = Buffer.from(key.toString('utf8').padEnd(KEY_LEN, '0').substring(0, KEY_LEN), 'utf8');
    const parts = value.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuf, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return value;
  }
}
