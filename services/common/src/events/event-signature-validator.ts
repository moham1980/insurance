import { SignedEventEnvelope, verifyEventSignature, KeyProvider } from './event-signer';

export interface MinimalLogger {
  info(msg: string, context?: Record<string, unknown>): void;
  warn(msg: string, context?: Record<string, unknown>): void;
  error(msg: string, context?: Record<string, unknown>): void;
  debug(msg: string, context?: Record<string, unknown>): void;
}

export interface SignatureValidationResult {
  valid: boolean;
  reason?: string;
  signerOrganizationId?: string;
  keyId?: string;
}

export class EventSignatureValidator {
  private readonly logger: MinimalLogger;

  constructor(
    private readonly keyProvider: KeyProvider,
    logger?: MinimalLogger,
  ) {
    this.logger = logger || { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as any;
  }

  async validate<T>(envelope: SignedEventEnvelope<T>): Promise<SignatureValidationResult> {
    if (!envelope.signature) {
      return { valid: false, reason: 'Missing signature' };
    }
    if (!envelope.signingKeyId) {
      return { valid: false, reason: 'Missing signingKeyId' };
    }
    if (!envelope.signerOrganizationId) {
      return { valid: false, reason: 'Missing signerOrganizationId' };
    }

    try {
      const publicKeyPem = await this.keyProvider.getPublicKey(envelope.signerOrganizationId, envelope.signingKeyId);
      if (!publicKeyPem) {
        return { valid: false, reason: `Public key not found for org ${envelope.signerOrganizationId} key ${envelope.signingKeyId}` };
      }

      const isValid = await verifyEventSignature(envelope, publicKeyPem);
      if (!isValid) {
        this.logger.warn('Event signature verification failed', {
          eventId: envelope.eventId,
          eventType: envelope.eventType,
          signerOrganizationId: envelope.signerOrganizationId,
        });
        return { valid: false, reason: 'Signature verification failed', signerOrganizationId: envelope.signerOrganizationId, keyId: envelope.signingKeyId };
      }

      return { valid: true, signerOrganizationId: envelope.signerOrganizationId, keyId: envelope.signingKeyId };
    } catch (err: any) {
      this.logger.error('Error during signature validation', err);
      return { valid: false, reason: err.message || 'Validation error' };
    }
  }

  async validateOrReject<T>(envelope: SignedEventEnvelope<T>): Promise<void> {
    const result = await this.validate(envelope);
    if (!result.valid) {
      throw new Error(`Event signature rejected: ${result.reason}`);
    }
  }
}
