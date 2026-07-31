import { Injectable, Logger, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { createHash, createVerify } from 'crypto';
import { FederationNonce } from './entities/FederationNonce';

const NONCE_TTL_MINUTES = 5;
const MAX_TIMESTAMP_SKEW_SECONDS = 60;

export interface FederationRequestSignature {
  nonce: string;
  timestamp: string;
  signature: string;
  signingKeyId: string;
}

@Injectable()
export class ReplayProtectionService {
  private readonly logger = new Logger(ReplayProtectionService.name);

  constructor(
    @InjectRepository(FederationNonce)
    private readonly repo: Repository<FederationNonce>,
  ) {}

  async checkAndStore(nonce: string, partnerId: string, requestHash: string): Promise<void> {
    const existing = await this.repo.findOne({ where: { nonce } });
    if (existing) {
      if (existing.status === 'used') {
        throw new ForbiddenException('Replay detected: nonce already used');
      }
      if (existing.requestHash !== requestHash) {
        throw new ForbiddenException('Replay detected: nonce reused with different request');
      }
      throw new ForbiddenException('Replay detected: nonce already consumed');
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + NONCE_TTL_MINUTES);

    const entity = this.repo.create({
      nonceId: uuidv4(),
      nonce,
      partnerId,
      requestHash,
      status: 'used',
      expiresAt,
    });
    await this.repo.save(entity);
  }

  validateTimestamp(timestamp: string): void {
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts)) {
      throw new BadRequestException('Invalid X-Federation-Timestamp: must be a Unix epoch in seconds');
    }
    const now = Math.floor(Date.now() / 1000);
    const skew = Math.abs(now - ts);
    if (skew > MAX_TIMESTAMP_SKEW_SECONDS) {
      throw new ForbiddenException(
        `Timestamp skew too large: ${skew}s exceeds max ${MAX_TIMESTAMP_SKEW_SECONDS}s`,
      );
    }
  }

  verifyRequestSignature(
    canonicalString: string,
    signature: string,
    publicKeyPem: string,
  ): void {
    const verifier = createVerify('RSA-SHA256');
    verifier.update(canonicalString, 'utf8');
    verifier.end();
    const valid = verifier.verify(publicKeyPem, signature, 'base64');
    if (!valid) {
      throw new ForbiddenException('Invalid X-Federation-Signature: signature verification failed');
    }
  }

  buildCanonicalString(method: string, path: string, nonce: string, timestamp: string, bodyHash: string): string {
    return [method.toUpperCase(), path, nonce, timestamp, bodyHash].join('\n');
  }

  computeBodyHash(body: unknown): string {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body ?? {});
    return createHash('sha256').update(bodyStr, 'utf8').digest('base64');
  }

  async validateFederationRequest(
    method: string,
    path: string,
    body: unknown,
    partnerId: string,
    sig: FederationRequestSignature,
    publicKeyPem: string,
  ): Promise<void> {
    this.validateTimestamp(sig.timestamp);

    const bodyHash = this.computeBodyHash(body);
    const canonical = this.buildCanonicalString(method, path, sig.nonce, sig.timestamp, bodyHash);

    this.verifyRequestSignature(canonical, sig.signature, publicKeyPem);

    await this.checkAndStore(sig.nonce, partnerId, bodyHash);
  }

  async cleanupExpired(): Promise<number> {
    const now = new Date();
    const expired = await this.repo.find({
      where: { status: 'active', expiresAt: LessThan(now) },
    });
    for (const n of expired) {
      n.status = 'expired';
      await this.repo.save(n);
    }
    return expired.length;
  }

  generateNonce(): string {
    return createHash('sha256').update(uuidv4() + Date.now()).digest('hex');
  }
}
