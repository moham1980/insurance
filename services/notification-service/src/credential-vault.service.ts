import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'node:crypto';
import { Credential, CredentialProvider, CredentialType } from './entities/Credential';

export interface CredentialValue {
  value: string;
  extra?: Record<string, string>;
}

export interface StoredCredentialValue {
  value: string;
  extra?: Record<string, string>;
}

@Injectable()
export class CredentialVaultService {
  private readonly logger = new Logger(CredentialVaultService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly masterKey: Buffer;

  constructor(
    @InjectRepository(Credential)
    private readonly credentialRepo: Repository<Credential>,
  ) {
    const masterKeyInput = process.env.CREDENTIAL_MASTER_KEY || '';
    if (!masterKeyInput) {
      this.logger.warn('CREDENTIAL_MASTER_KEY is not set; a deterministic derived key will be used from empty input');
    }
    this.masterKey = scryptSync(masterKeyInput, 'credential-vault-salt', 32);
  }

  private encrypt(plain: string): { encrypted: string; iv: string; tag: string } {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.masterKey, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
    };
  }

  private decrypt(encrypted: string, iv: string, tag: string): string {
    const decipher = createDecipheriv(this.algorithm, this.masterKey, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]);
    return decrypted.toString('utf8');
  }

  private mask(value: string): string {
    if (value.length <= 8) return '*'.repeat(value.length);
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
  }

  async getCredentialValue(params: {
    tenantId: string;
    provider: CredentialProvider;
    credentialType: CredentialType;
  }): Promise<CredentialValue | null> {
    const row = await this.credentialRepo.findOne({
      where: {
        tenantId: params.tenantId,
        provider: params.provider,
        credentialType: params.credentialType,
        isActive: true,
      },
      order: { createdAt: 'DESC' },
    });

    if (!row) return null;
    if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
      this.logger.warn(`Expired credential for tenant ${params.tenantId} provider ${params.provider}`);
      return null;
    }

    try {
      const envelope = JSON.parse(row.encryptedValue) as { encrypted: string; iv: string; tag: string };
      const plain = this.decrypt(envelope.encrypted, envelope.iv, envelope.tag);
      return { value: plain, extra: row.metadata as Record<string, string> };
    } catch (e) {
      this.logger.error(`Failed to decrypt credential ${row.credentialId}`, e);
      return null;
    }
  }

  async getCredential(tenantId: string, provider: CredentialProvider, credentialType: CredentialType) {
    return this.credentialRepo.findOne({
      where: { tenantId, provider, credentialType, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async setCredential(params: {
    tenantId: string;
    provider: CredentialProvider;
    credentialType: CredentialType;
    value: string;
    extra?: Record<string, string>;
    expiresAt?: Date;
  }): Promise<Credential> {
    const envelope = this.encrypt(params.value);
    const row = this.credentialRepo.create({
      tenantId: params.tenantId,
      provider: params.provider,
      credentialType: params.credentialType,
      encryptedValue: JSON.stringify(envelope),
      maskedValue: this.mask(params.value),
      isActive: true,
      expiresAt: params.expiresAt || null,
      metadata: params.extra || null,
    });
    return this.credentialRepo.save(row);
  }

  async rotateCredential(params: {
    tenantId: string;
    provider: CredentialProvider;
    credentialType: CredentialType;
    value: string;
    extra?: Record<string, string>;
    expiresAt?: Date;
  }): Promise<Credential> {
    await this.credentialRepo.update(
      { tenantId: params.tenantId, provider: params.provider, credentialType: params.credentialType, isActive: true },
      { isActive: false }
    );
    return this.setCredential(params);
  }

  async listCredentials(tenantId?: string, provider?: string): Promise<Credential[]> {
    const qb = this.credentialRepo.createQueryBuilder('c');
    if (tenantId) qb.andWhere('c.tenantId = :tenantId', { tenantId });
    if (provider) qb.andWhere('c.provider = :provider', { provider });
    qb.orderBy('c.createdAt', 'DESC');
    return qb.getMany();
  }

  async deleteCredential(credentialId: string): Promise<boolean> {
    const result = await this.credentialRepo.delete({ credentialId });
    return (result.affected ?? 0) > 0;
  }
}
