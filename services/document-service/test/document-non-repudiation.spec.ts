import { DocumentNonRepudiationService, SigningKeyProvider, EnvSigningKeyProvider } from '../src/document-non-repudiation.service';
import { Document } from '../src/entities/Document';
import { generateKeyPairSync } from 'crypto';

describe('DocumentNonRepudiationService', () => {
  let service: DocumentNonRepudiationService;
  let keyProvider: SigningKeyProvider;
  let privateKeyPem: string;
  let publicKeyPem: string;

  beforeAll(() => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    privateKeyPem = privateKey.export({ type: 'pkcs1', format: 'pem' }) as string;
    publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
  });

  beforeEach(() => {
    keyProvider = {
      getActiveSigningKey: async () => ({ keyId: 'test-key-1', privateKeyPem }),
      getPublicKey: async () => publicKeyPem,
    };
    service = new DocumentNonRepudiationService(keyProvider);
  });

  function createTestDocument(): Document {
    const doc = new Document();
    doc.documentId = 'doc-001';
    doc.tenantId = 'tenant-001';
    doc.fileName = 'policy.pdf';
    doc.storageRef = '/data/policy.pdf';
    doc.mimeType = 'application/pdf';
    doc.fileSize = 1024;
    doc.documentType = 'invoice';
    doc.status = 'pending';
    doc.metadata = {};
    return doc;
  }

  describe('computeDigest', () => {
    it('should compute a deterministic SHA-256 digest', () => {
      const content = 'test content for digest';
      const digest1 = service.computeDigest(content);
      const digest2 = service.computeDigest(content);

      expect(digest1.algorithm).toBe('sha256');
      expect(digest1.value).toHaveLength(64);
      expect(digest1.value).toBe(digest2.value);
    });

    it('should produce different digests for different content', () => {
      const digest1 = service.computeDigest('content A');
      const digest2 = service.computeDigest('content B');
      expect(digest1.value).not.toBe(digest2.value);
    });
  });

  describe('signDocument', () => {
    it('should sign a document and attach non-repudiation metadata', async () => {
      const doc = createTestDocument();
      const content = 'policy document content';

      const { digest, signature } = await service.signDocument(
        doc,
        content,
        'org-001',
        'insurance-core',
        'corr-001',
      );

      expect(digest.algorithm).toBe('sha256');
      expect(digest.value).toHaveLength(64);
      expect(signature.keyId).toBe('test-key-1');
      expect(signature.signerOrganizationId).toBe('org-001');
      expect(signature.algorithm).toBe('RS256');
      expect(signature.value).toBeTruthy();
      expect(signature.correlationId).toBe('corr-001');

      const meta = (doc.metadata as any).nonRepudiation;
      expect(meta).toBeDefined();
      expect(meta.digest.value).toBe(digest.value);
      expect(meta.signature.value).toBe(signature.value);
      expect(meta.sourceSystemId).toBe('insurance-core');
    });
  });

  describe('verifyDocument', () => {
    it('should verify a validly signed document', async () => {
      const doc = createTestDocument();
      const content = 'policy document content';

      await service.signDocument(doc, content, 'org-001', 'insurance-core', 'corr-001');

      const result = await service.verifyDocument(doc, content);

      expect(result.valid).toBe(true);
      expect(result.digestMatch).toBe(true);
      expect(result.signatureValid).toBe(true);
      expect(result.signerOrganizationId).toBe('org-001');
      expect(result.keyId).toBe('test-key-1');
    });

    it('should detect tampered content (digest mismatch)', async () => {
      const doc = createTestDocument();
      const originalContent = 'original policy content';
      const tamperedContent = 'tampered policy content';

      await service.signDocument(doc, originalContent, 'org-001', 'insurance-core');

      const result = await service.verifyDocument(doc, tamperedContent);

      expect(result.valid).toBe(false);
      expect(result.digestMatch).toBe(false);
      expect(result.signatureValid).toBe(false);
      expect(result.reason).toContain('digest mismatch');
    });

    it('should return invalid for document without non-repudiation metadata', async () => {
      const doc = createTestDocument();
      doc.metadata = {};

      const result = await service.verifyDocument(doc, 'some content');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('no non-repudiation metadata');
    });
  });

  describe('verifyOrQuarantine', () => {
    it('should quarantine a tampered document (set status to failed)', async () => {
      const doc = createTestDocument();
      const originalContent = 'original content';
      const tamperedContent = 'tampered content';

      await service.signDocument(doc, originalContent, 'org-001', 'insurance-core');
      const result = await service.verifyOrQuarantine(doc, tamperedContent);

      expect(result.valid).toBe(false);
      expect(doc.status).toBe('failed');
      const meta = (doc.metadata as any).nonRepudiation;
      expect(meta.verificationResult).toBeDefined();
      expect(meta.quarantinedAt).toBeDefined();
    });

    it('should not quarantine a valid document', async () => {
      const doc = createTestDocument();
      const content = 'valid content';

      await service.signDocument(doc, content, 'org-001', 'insurance-core');
      const result = await service.verifyOrQuarantine(doc, content);

      expect(result.valid).toBe(true);
      expect(doc.status).toBe('pending');
    });
  });

  describe('EnvSigningKeyProvider', () => {
    it('should throw if env vars not set', async () => {
      const provider = new EnvSigningKeyProvider();
      await expect(provider.getActiveSigningKey('org-1')).rejects.toThrow();
    });
  });
});
