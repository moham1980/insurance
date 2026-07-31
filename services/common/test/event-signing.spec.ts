import {
  canonicalJsonString,
  computeEventDigest,
  signEvent,
  verifyEventSignature,
  generateSigningKeyPair,
} from '../src/events/event-signer';
import { EventSignatureValidator as Validator } from '../src/events/event-signature-validator';

describe('Event Signing', () => {
  describe('canonicalJsonString', () => {
    it('should produce deterministic JSON with sorted keys', () => {
      const obj = { b: 2, a: 1, c: 3 };
      expect(canonicalJsonString(obj)).toBe('{"a":1,"b":2,"c":3}');
    });

    it('should handle nested objects', () => {
      const obj = { outer: { d: 4, a: 1 } };
      expect(canonicalJsonString(obj)).toBe('{"outer":{"a":1,"d":4}}');
    });

    it('should handle arrays', () => {
      const obj = { items: [3, 1, 2] };
      expect(canonicalJsonString(obj)).toBe('{"items":[3,1,2]}');
    });

    it('should produce same output for same data regardless of key order', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { b: 2, a: 1 };
      expect(canonicalJsonString(obj1)).toBe(canonicalJsonString(obj2));
    });
  });

  describe('computeEventDigest', () => {
    it('should produce a base64 sha256 digest', () => {
      const envelope = {
        eventId: 'evt-1',
        eventType: 'PolicyIssued',
        eventVersion: 1,
        occurredAt: '2025-01-01T00:00:00Z',
        producer: 'policy-service',
        correlationId: 'corr-1',
        tenantId: 'tenant-1',
        subject: {},
        payload: { policyId: 'pol-1' },
      };
      const digest = computeEventDigest(envelope);
      expect(digest).toBeDefined();
      expect(typeof digest).toBe('string');
      expect(digest.length).toBeGreaterThan(0);
    });
  });

  describe('signEvent and verifyEventSignature', () => {
    const keyPair = generateSigningKeyPair('org-1');
    const signingKey = {
      keyId: keyPair.keyId,
      organizationId: 'org-1',
      privateKeyPem: keyPair.privateKeyPem,
      publicKeyPem: keyPair.publicKeyPem,
      algorithm: 'RS256' as const,
      createdAt: new Date(),
      status: 'active' as const,
    };

    const sampleEnvelope = {
      eventId: 'evt-1',
      eventType: 'PolicyIssued',
      eventVersion: 1,
      occurredAt: '2025-01-01T00:00:00Z',
      producer: 'policy-service',
      correlationId: 'corr-1',
      tenantId: 'tenant-1',
      subject: {},
      payload: { policyId: 'pol-1', premiumAmount: 100000 },
    };

    it('should sign an event and produce a valid signature', async () => {
      const signed = await signEvent(sampleEnvelope, signingKey);
      expect(signed.signature).toBeDefined();
      expect(signed.signingKeyId).toBe(keyPair.keyId);
      expect(signed.signerOrganizationId).toBe('org-1');
    });

    it('should verify a valid signature', async () => {
      const signed = await signEvent(sampleEnvelope, signingKey);
      const isValid = await verifyEventSignature(signed, keyPair.publicKeyPem);
      expect(isValid).toBe(true);
    });

    it('should reject a tampered payload', async () => {
      const signed = await signEvent(sampleEnvelope, signingKey);
      const tampered = { ...signed, payload: { policyId: 'pol-1', premiumAmount: 999999 } };
      const isValid = await verifyEventSignature(tampered, keyPair.publicKeyPem);
      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong public key', async () => {
      const signed = await signEvent(sampleEnvelope, signingKey);
      const otherKeyPair = generateSigningKeyPair('org-2');
      const isValid = await verifyEventSignature(signed, otherKeyPair.publicKeyPem);
      expect(isValid).toBe(false);
    });
  });

  describe('EventSignatureValidator', () => {
    it('should reject envelope without signature', async () => {
      const keyPair = generateSigningKeyPair('org-1');
      const keyProvider = {
        getActiveKey: jest.fn(),
        getPublicKey: jest.fn(),
      };
      const validator = new Validator(keyProvider as any);

      const result = await validator.validate({
        eventId: 'evt-1',
        eventType: 'Test',
        eventVersion: 1,
        occurredAt: '2025-01-01T00:00:00Z',
        producer: 'test',
        correlationId: 'corr-1',
        subject: {},
        payload: {},
        signature: '',
        signingKeyId: '',
        signerOrganizationId: '',
      } as any);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Missing signature');
    });

    it('should validate a properly signed event', async () => {
      const keyPair = generateSigningKeyPair('org-1');
      const signingKey = {
        keyId: keyPair.keyId,
        organizationId: 'org-1',
        privateKeyPem: keyPair.privateKeyPem,
        publicKeyPem: keyPair.publicKeyPem,
        algorithm: 'RS256' as const,
        createdAt: new Date(),
        status: 'active' as const,
      };

      const envelope = {
        eventId: 'evt-1',
        eventType: 'PolicyIssued',
        eventVersion: 1,
        occurredAt: '2025-01-01T00:00:00Z',
        producer: 'policy-service',
        correlationId: 'corr-1',
        subject: {},
        payload: { policyId: 'pol-1' },
      };

      const signed = await signEvent(envelope, signingKey);

      const keyProvider = {
        getActiveKey: jest.fn(),
        getPublicKey: jest.fn().mockResolvedValue(keyPair.publicKeyPem),
      };
      const validator = new Validator(keyProvider as any);
      const result = await validator.validate(signed);

      expect(result.valid).toBe(true);
      expect(result.signerOrganizationId).toBe('org-1');
    });

    it('should throw on validateOrReject for invalid signature', async () => {
      const keyProvider = {
        getActiveKey: jest.fn(),
        getPublicKey: jest.fn(),
      };
      const validator = new Validator(keyProvider as any);

      await expect(
        validator.validateOrReject({
          eventId: 'evt-1',
          eventType: 'Test',
          eventVersion: 1,
          occurredAt: '2025-01-01T00:00:00Z',
          producer: 'test',
          correlationId: 'corr-1',
          subject: {},
          payload: {},
          signature: 'invalid',
          signingKeyId: 'key-1',
          signerOrganizationId: 'org-1',
        } as any),
      ).rejects.toThrow('Event signature rejected');
    });
  });
});
