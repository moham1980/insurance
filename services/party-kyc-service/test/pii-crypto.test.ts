// @ts-nocheck
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { encryptAead, decryptAead, blindIndex } from '../src/pii-crypto';

describe('pii-crypto', () => {
  const originalEncryptionKey = process.env.FIELD_ENCRYPTION_KEY;
  const originalBlindIndexKey = process.env.FIELD_BLIND_INDEX_KEY;

  beforeAll(() => {
    process.env.FIELD_ENCRYPTION_KEY = 'a'.repeat(32);
    process.env.FIELD_BLIND_INDEX_KEY = 'b'.repeat(32);
  });

  afterAll(() => {
    if (originalEncryptionKey === undefined) delete process.env.FIELD_ENCRYPTION_KEY;
    else process.env.FIELD_ENCRYPTION_KEY = originalEncryptionKey;
    if (originalBlindIndexKey === undefined) delete process.env.FIELD_BLIND_INDEX_KEY;
    else process.env.FIELD_BLIND_INDEX_KEY = originalBlindIndexKey;
  });

  it('encrypts and decrypts plaintext deterministically for blind index', () => {
    const plaintext = '1234567890';
    const encrypted = encryptAead(plaintext);
    const decrypted = decryptAead(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('produces deterministic blind index for the same national ID', () => {
    const id = '۰۱۲۳۴۵۶۷۸۹'; // Persian digits
    const idx1 = blindIndex(id);
    const idx2 = blindIndex(id);
    expect(idx1).toBe(idx2);
    expect(idx1).not.toBe(id);
  });

  it('throws when encryption key is missing', () => {
    delete process.env.FIELD_ENCRYPTION_KEY;
    expect(() => encryptAead('test')).toThrow();
    process.env.FIELD_ENCRYPTION_KEY = 'a'.repeat(32);
  });
});
