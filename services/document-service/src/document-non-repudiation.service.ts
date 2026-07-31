import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { createHash, createSign, createVerify, randomBytes } from 'crypto';
import { Document } from './entities/Document';

export interface DocumentDigest {
  algorithm: 'sha256';
  value: string;
  computedAt: string;
}

export interface DocumentSignature {
  keyId: string;
  signerOrganizationId: string;
  algorithm: 'RS256';
  value: string;
  signedAt: string;
  correlationId?: string;
}

export interface NonRepudiationVerificationResult {
  valid: boolean;
  digestMatch: boolean;
  signatureValid: boolean;
  reason?: string;
  signerOrganizationId?: string;
  keyId?: string;
  verifiedAt: string;
}

export interface SigningKeyProvider {
  getActiveSigningKey(organizationId: string): Promise<{ keyId: string; privateKeyPem: string }>;
  getPublicKey(organizationId: string, keyId: string): Promise<string>;
}

@Injectable()
export class DocumentNonRepudiationService {
  private readonly logger = new Logger(DocumentNonRepudiationService.name);

  constructor(private readonly keyProvider: SigningKeyProvider) {}

  computeDigest(content: Buffer | string): DocumentDigest {
    const buf = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
    const hash = createHash('sha256').update(buf).digest('hex');
    return {
      algorithm: 'sha256',
      value: hash,
      computedAt: new Date().toISOString(),
    };
  }

  async signDocument(
    document: Document,
    content: Buffer | string,
    signerOrganizationId: string,
    sourceSystemId: string,
    correlationId?: string,
  ): Promise<{ digest: DocumentDigest; signature: DocumentSignature }> {
    const digest = this.computeDigest(content);

    const { keyId, privateKeyPem } = await this.keyProvider.getActiveSigningKey(signerOrganizationId);

    const signer = createSign('RSA-SHA256');
    const canonicalPayload = this.buildCanonicalPayload(document, digest, sourceSystemId);
    signer.update(canonicalPayload);
    signer.end();
    const signatureValue = signer.sign(privateKeyPem, 'base64');

    const signature: DocumentSignature = {
      keyId,
      signerOrganizationId,
      algorithm: 'RS256',
      value: signatureValue,
      signedAt: new Date().toISOString(),
      correlationId,
    };

    document.metadata = {
      ...(document.metadata || {}),
      nonRepudiation: {
        digest,
        signature,
        sourceSystemId,
      },
    };

    this.logger.log(
      `Document ${document.documentId} signed with key ${keyId} by org ${signerOrganizationId}`,
    );

    return { digest, signature };
  }

  async verifyDocument(
    document: Document,
    content: Buffer | string,
  ): Promise<NonRepudiationVerificationResult> {
    const meta = (document.metadata as any)?.nonRepudiation;
    if (!meta) {
      return {
        valid: false,
        digestMatch: false,
        signatureValid: false,
        reason: 'Document has no non-repudiation metadata',
        verifiedAt: new Date().toISOString(),
      };
    }

    const storedDigest: DocumentDigest = meta.digest;
    const storedSignature: DocumentSignature = meta.signature;
    const sourceSystemId: string = meta.sourceSystemId;

    const computedDigest = this.computeDigest(content);
    const digestMatch = computedDigest.value === storedDigest.value;

    if (!digestMatch) {
      this.logger.warn(
        `Document ${document.documentId} digest mismatch: expected ${storedDigest.value}, got ${computedDigest.value}`,
      );
      return {
        valid: false,
        digestMatch: false,
        signatureValid: false,
        reason: 'Content digest mismatch — document may have been tampered',
        verifiedAt: new Date().toISOString(),
      };
    }

    try {
      const publicKeyPem = await this.keyProvider.getPublicKey(
        storedSignature.signerOrganizationId,
        storedSignature.keyId,
      );
      if (!publicKeyPem) {
        return {
          valid: false,
          digestMatch: true,
          signatureValid: false,
          reason: `Public key not found for org ${storedSignature.signerOrganizationId} key ${storedSignature.keyId}`,
          verifiedAt: new Date().toISOString(),
        };
      }

      const verifier = createVerify('RSA-SHA256');
      const canonicalPayload = this.buildCanonicalPayload(document, storedDigest, sourceSystemId);
      verifier.update(canonicalPayload);
      verifier.end();

      const signatureValid = verifier.verify(publicKeyPem, storedSignature.value, 'base64');

      if (!signatureValid) {
        this.logger.warn(
          `Document ${document.documentId} signature verification failed for org ${storedSignature.signerOrganizationId}`,
        );
      }

      return {
        valid: signatureValid,
        digestMatch: true,
        signatureValid,
        reason: signatureValid ? undefined : 'Signature verification failed',
        signerOrganizationId: storedSignature.signerOrganizationId,
        keyId: storedSignature.keyId,
        verifiedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      this.logger.error(`Error verifying document ${document.documentId}: ${err.message}`, err.stack);
      return {
        valid: false,
        digestMatch: true,
        signatureValid: false,
        reason: err.message || 'Verification error',
        verifiedAt: new Date().toISOString(),
      };
    }
  }

  async verifyOrQuarantine(
    document: Document,
    content: Buffer | string,
  ): Promise<NonRepudiationVerificationResult> {
    const result = await this.verifyDocument(document, content);
    if (!result.valid) {
      this.logger.error(
        `Document ${document.documentId} failed non-repudiation verification: ${result.reason}. ` +
          `Quarantining — document will NOT be projected or archived.`,
        );
      document.status = 'failed';
      document.metadata = {
        ...(document.metadata || {}),
        nonRepudiation: {
          ...((document.metadata as any)?.nonRepudiation || {}),
          verificationResult: result,
          quarantinedAt: new Date().toISOString(),
        },
      };
    }
    return result;
  }

  private buildCanonicalPayload(
    document: Document,
    digest: DocumentDigest,
    sourceSystemId: string,
  ): string {
    const payload = {
      documentId: document.documentId,
      tenantId: document.tenantId,
      fileName: document.fileName,
      storageRef: document.storageRef,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      documentType: document.documentType,
      sourceSystemId,
      digest: digest.value,
      digestAlgorithm: digest.algorithm,
    };
    const keys = Object.keys(payload).sort();
    const pairs = keys.map((k) => `"${k}":${JSON.stringify((payload as any)[k])}`);
    return `{${pairs.join(',')}}`;
  }
}

export class EnvSigningKeyProvider implements SigningKeyProvider {
  private readonly logger = new Logger(EnvSigningKeyProvider.name);

  async getActiveSigningKey(organizationId: string): Promise<{ keyId: string; privateKeyPem: string }> {
    const keyId = process.env.DOC_SIGNING_KEY_ID || `doc-key-${organizationId}`;
    const keyPath = process.env.DOC_SIGNING_PRIVATE_KEY_PATH;
    if (!keyPath) {
      throw new BadRequestException('DOC_SIGNING_PRIVATE_KEY_PATH not configured for document signing');
    }
    const privateKeyPem = require('fs').readFileSync(keyPath, 'utf-8');
    return { keyId, privateKeyPem };
  }

  async getPublicKey(organizationId: string, keyId: string): Promise<string> {
    const keyPath = process.env.DOC_SIGNING_PUBLIC_KEY_PATH;
    if (!keyPath) {
      throw new BadRequestException('DOC_SIGNING_PUBLIC_KEY_PATH not configured for document verification');
    }
    return require('fs').readFileSync(keyPath, 'utf-8');
  }
}
