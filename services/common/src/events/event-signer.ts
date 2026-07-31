import { createHash, createSign, createVerify, randomBytes } from 'crypto';

export interface SignedEventEnvelope<T = unknown> {
  eventId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: string;
  producer: string;
  correlationId: string;
  tenantId?: string;
  organizationId?: string;
  idempotencyKey?: string;
  causationId?: string;
  dataClassification?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'PII';
  subject: Record<string, any>;
  payload: T;
  signature: string;
  signingKeyId: string;
  signerOrganizationId: string;
}

export interface SigningKey {
  keyId: string;
  organizationId: string;
  privateKeyPem: string;
  publicKeyPem: string;
  algorithm: 'RS256';
  createdAt: Date;
  rotatedAt?: Date;
  status: 'active' | 'rotated' | 'revoked';
}

export interface KeyProvider {
  getActiveKey(organizationId: string): Promise<SigningKey>;
  getPublicKey(organizationId: string, keyId: string): Promise<string>;
}

export function canonicalJsonString(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJsonString).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys.map((k) => {
    const val = (obj as Record<string, unknown>)[k];
    return JSON.stringify(k) + ':' + canonicalJsonString(val);
  });
  return '{' + pairs.join(',') + '}';
}

export function computeEventDigest<T>(envelope: Omit<SignedEventEnvelope<T>, 'signature' | 'signingKeyId' | 'signerOrganizationId'>): string {
  const canonical = canonicalJsonString(envelope);
  return createHash('sha256').update(canonical).digest('base64');
}

export async function signEvent<T>(
  envelope: Omit<SignedEventEnvelope<T>, 'signature' | 'signingKeyId' | 'signerOrganizationId'>,
  key: SigningKey,
): Promise<SignedEventEnvelope<T>> {
  const digest = computeEventDigest(envelope);
  const signer = createSign('RSA-SHA256');
  signer.update(digest, 'base64');
  signer.end();
  const signature = signer.sign(key.privateKeyPem, 'base64');
  return {
    ...envelope,
    signature,
    signingKeyId: key.keyId,
    signerOrganizationId: key.organizationId,
  };
}

export async function verifyEventSignature<T>(
  envelope: SignedEventEnvelope<T>,
  publicKeyPem: string,
): Promise<boolean> {
  const { signature, signingKeyId, signerOrganizationId, ...rest } = envelope;
  const digest = computeEventDigest(rest as Omit<SignedEventEnvelope<T>, 'signature' | 'signingKeyId' | 'signerOrganizationId'>);
  const verifier = createVerify('RSA-SHA256');
  verifier.update(digest, 'base64');
  verifier.end();
  try {
    return verifier.verify(publicKeyPem, signature, 'base64');
  } catch {
    return false;
  }
}

export function generateKeyId(): string {
  return 'key-' + randomBytes(8).toString('hex');
}

export function generateSigningKeyPair(organizationId: string): { keyId: string; privateKeyPem: string; publicKeyPem: string } {
  const { generateKeyPairSync } = require('crypto');
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return {
    keyId: generateKeyId(),
    privateKeyPem: privateKey as string,
    publicKeyPem: publicKey as string,
  };
}
