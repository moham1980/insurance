import { generateSigningKeyPair, signEvent, verifyEventSignature, computeEventDigest, canonicalJsonString, SignedEventEnvelope, SigningKey } from '../event-signer';
import { EventSignatureValidator, KeyProvider } from '../event-signature-validator';

describe('Event Signing (JWS)', () => {
  let keyPair: { keyId: string; privateKeyPem: string; publicKeyPem: string };
  let signingKey: SigningKey;

  beforeAll(() => {
    keyPair = generateSigningKeyPair('org-test-1');
    signingKey = {
      keyId: keyPair.keyId,
      organizationId: 'org-test-1',
      privateKeyPem: keyPair.privateKeyPem,
      publicKeyPem: keyPair.publicKeyPem,
      algorithm: 'RS256',
      createdAt: new Date(),
      status: 'active',
    };
  });

  it('should generate an RSA key pair', () => {
    expect(keyPair.keyId).toMatch(/^key-/);
    expect(keyPair.privateKeyPem).toContain('BEGIN PRIVATE KEY');
    expect(keyPair.publicKeyPem).toContain('BEGIN PUBLIC KEY');
  });

  it('should produce canonical JSON with sorted keys', () => {
    const obj = { b: 1, a: 2, c: { z: 1, y: 2 } };
    const canonical = canonicalJsonString(obj);
    expect(canonical).toBe('{"a":2,"b":1,"c":{"y":2,"z":1}}');
  });

  it('should compute a deterministic digest', () => {
    const envelope = {
      eventId: 'evt-1',
      eventType: 'TestEvent',
      eventVersion: 1,
      occurredAt: '2025-01-01T00:00:00.000Z',
      producer: 'test-service',
      correlationId: 'corr-1',
      tenantId: 'tenant-1',
      subject: { policyId: 'pol-1' },
      payload: { foo: 'bar' },
    };
    const digest1 = computeEventDigest(envelope);
    const digest2 = computeEventDigest(envelope);
    expect(digest1).toBe(digest2);
    expect(digest1).toHaveLength(44); // base64 sha256 = 44 chars
  });

  it('should sign and verify an event', async () => {
    const envelope = {
      eventId: 'evt-2',
      eventType: 'PolicyProjectionSynchronized',
      eventVersion: 1,
      occurredAt: '2025-01-01T00:00:00.000Z',
      producer: 'policy-service',
      correlationId: 'corr-2',
      tenantId: 'tenant-1',
      subject: { policyId: 'pol-2' },
      payload: { policyId: 'pol-2', projectionId: 'proj-1' },
    };

    const signed = await signEvent(envelope, signingKey);
    expect(signed.signature).toBeTruthy();
    expect(signed.signingKeyId).toBe(keyPair.keyId);
    expect(signed.signerOrganizationId).toBe('org-test-1');

    const isValid = await verifyEventSignature(signed, keyPair.publicKeyPem);
    expect(isValid).toBe(true);
  });

  it('should reject a tampered event signature', async () => {
    const envelope = {
      eventId: 'evt-3',
      eventType: 'TestEvent',
      eventVersion: 1,
      occurredAt: '2025-01-01T00:00:00.000Z',
      producer: 'test-service',
      correlationId: 'corr-3',
      tenantId: 'tenant-1',
      subject: {},
      payload: { value: 'original' },
    };

    const signed = await signEvent(envelope, signingKey);
    signed.payload = { value: 'tampered' };

    const isValid = await verifyEventSignature(signed, keyPair.publicKeyPem);
    expect(isValid).toBe(false);
  });

  it('should reject signature with wrong public key', async () => {
    const otherKeyPair = generateSigningKeyPair('org-test-2');
    const envelope = {
      eventId: 'evt-4',
      eventType: 'TestEvent',
      eventVersion: 1,
      occurredAt: '2025-01-01T00:00:00.000Z',
      producer: 'test-service',
      correlationId: 'corr-4',
      tenantId: 'tenant-1',
      subject: {},
      payload: { data: 'test' },
    };

    const signed = await signEvent(envelope, signingKey);
    const isValid = await verifyEventSignature(signed, otherKeyPair.publicKeyPem);
    expect(isValid).toBe(false);
  });
});

describe('EventSignatureValidator', () => {
  let keyPair: { keyId: string; privateKeyPem: string; publicKeyPem: string };
  let signingKey: SigningKey;
  let keyProvider: KeyProvider;
  let validator: EventSignatureValidator;

  beforeAll(() => {
    keyPair = generateSigningKeyPair('org-validator-test');
    signingKey = {
      keyId: keyPair.keyId,
      organizationId: 'org-validator-test',
      privateKeyPem: keyPair.privateKeyPem,
      publicKeyPem: keyPair.publicKeyPem,
      algorithm: 'RS256',
      createdAt: new Date(),
      status: 'active',
    };
    keyProvider = {
      async getActiveKey(): Promise<SigningKey> { return signingKey; },
      async getPublicKey(): Promise<string> { return keyPair.publicKeyPem; },
    };
    validator = new EventSignatureValidator(keyProvider);
  });

  it('should validate a correctly signed event', async () => {
    const envelope = {
      eventId: 'evt-val-1',
      eventType: 'TestEvent',
      eventVersion: 1,
      occurredAt: '2025-01-01T00:00:00.000Z',
      producer: 'test-service',
      correlationId: 'corr-val-1',
      tenantId: 'tenant-1',
      subject: {},
      payload: { test: true },
    };

    const signed = await signEvent(envelope, signingKey);
    const result = await validator.validate(signed);
    expect(result.valid).toBe(true);
    expect(result.signerOrganizationId).toBe('org-validator-test');
  });

  it('should reject event without signature', async () => {
    const envelope = {
      eventId: 'evt-val-2',
      eventType: 'TestEvent',
      eventVersion: 1,
      occurredAt: '2025-01-01T00:00:00.000Z',
      producer: 'test-service',
      correlationId: 'corr-val-2',
      tenantId: 'tenant-1',
      subject: {},
      payload: { test: true },
      signature: '',
      signingKeyId: '',
      signerOrganizationId: '',
    } as any;

    const result = await validator.validate(envelope);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Missing signature');
  });

  it('should reject event with unknown key', async () => {
    const unknownKeyProvider: KeyProvider = {
      async getActiveKey(): Promise<SigningKey> { return signingKey; },
      async getPublicKey(): Promise<string> { return ''; },
    };
    const val = new EventSignatureValidator(unknownKeyProvider);

    const envelope = {
      eventId: 'evt-val-3',
      eventType: 'TestEvent',
      eventVersion: 1,
      occurredAt: '2025-01-01T00:00:00.000Z',
      producer: 'test-service',
      correlationId: 'corr-val-3',
      tenantId: 'tenant-1',
      subject: {},
      payload: { test: true },
    };

    const signed = await signEvent(envelope, signingKey);
    const result = await val.validate(signed);
    expect(result.valid).toBe(false);
  });

  it('should throw on validateOrReject for invalid event', async () => {
    const envelope = {
      eventId: 'evt-val-4',
      eventType: 'TestEvent',
      eventVersion: 1,
      occurredAt: '2025-01-01T00:00:00.000Z',
      producer: 'test-service',
      correlationId: 'corr-val-4',
      tenantId: 'tenant-1',
      subject: {},
      payload: { test: true },
      signature: '',
      signingKeyId: '',
      signerOrganizationId: '',
    } as any;

    await expect(validator.validateOrReject(envelope)).rejects.toThrow('Event signature rejected');
  });
});
