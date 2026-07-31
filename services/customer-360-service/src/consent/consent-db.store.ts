import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { ConsentRecordEntity } from '../entities/ConsentRecordEntity';
import { ConsentRecord } from '../models/Customer360Profile';

/**
 * ConsentDbStore — Database-backed consent record store.
 *
 * Replaces the file-based ConsentStore with a TypeORM repository.
 * Uses the consent_records table created by migration 1700000001100.
 */
@Injectable()
export class ConsentDbStore {
  private readonly logger = new Logger(ConsentDbStore.name);

  constructor(
    @InjectRepository(ConsentRecordEntity)
    private readonly repo: Repository<ConsentRecordEntity>,
  ) {}

  async list(customerId: string): Promise<ConsentRecord[]> {
    const entities = await this.repo.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toRecord(this.withEffectiveStatus(e)));
  }

  async check(
    customerId: string,
    purpose: string,
  ): Promise<{ purpose: string; granted: boolean; consent: ConsentRecord | null }> {
    const entity = await this.repo.findOne({
      where: { customerId, purpose },
      order: { createdAt: 'DESC' },
    });

    const effective = entity ? this.withEffectiveStatus(entity) : null;
    return {
      purpose,
      granted: effective?.status === 'granted',
      consent: effective ? this.toRecord(effective) : null,
    };
  }

  async add(
    params: Omit<ConsentRecord, 'consentId' | 'createdAt' | 'updatedAt'>,
  ): Promise<ConsentRecord> {
    const now = new Date();
    const entity = this.repo.create({
      consentId: randomUUID(),
      customerId: params.customerId,
      purpose: params.purpose,
      status: params.status,
      grantedAt: params.grantedAt,
      expiresAt: params.expiresAt,
      revokedAt: params.revokedAt,
      revocationReason: params.revocationReason,
      version: params.version,
      source: params.source,
      channel: params.channel,
      actorUserId: params.actorUserId,
      tenantId: params.tenantId,
      createdAt: now,
      updatedAt: now,
    });
    const saved = await this.repo.save(entity);
    return this.toRecord(saved);
  }

  async revoke(
    customerId: string,
    consentId: string,
    reason?: string,
  ): Promise<ConsentRecord | null> {
    const entity = await this.repo.findOne({ where: { consentId, customerId } });
    if (!entity) return null;

    entity.status = 'revoked';
    entity.revokedAt = new Date();
    entity.revocationReason = reason || entity.revocationReason;
    entity.updatedAt = new Date();
    const saved = await this.repo.save(entity);
    return this.toRecord(this.withEffectiveStatus(saved));
  }

  private withEffectiveStatus(entity: ConsentRecordEntity): ConsentRecordEntity {
    if (entity.status !== 'granted') return entity;
    if (entity.expiresAt && new Date(entity.expiresAt) < new Date()) {
      return { ...entity, status: 'expired' };
    }
    return entity;
  }

  private toRecord(entity: ConsentRecordEntity): ConsentRecord {
    return {
      consentId: entity.consentId,
      customerId: entity.customerId,
      purpose: entity.purpose,
      status: entity.status as ConsentRecord['status'],
      grantedAt: entity.grantedAt,
      expiresAt: entity.expiresAt,
      revokedAt: entity.revokedAt,
      revocationReason: entity.revocationReason,
      version: entity.version,
      source: entity.source || '',
      channel: entity.channel || '',
      actorUserId: entity.actorUserId,
      tenantId: entity.tenantId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
