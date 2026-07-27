import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { IdempotencyKey } from './entities/IdempotencyKey';

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectRepository(IdempotencyKey)
    private readonly repo: Repository<IdempotencyKey>,
  ) {}

  /**
   * Check for an existing idempotent result.
   * Returns the stored response if found, otherwise null.
   */
  async getExisting(tenantId: string, scope: string, key: string): Promise<Record<string, any> | null> {
    if (!key) return null;
    const record = await this.repo.findOne({
      where: { tenantId, key, scope },
    });
    if (!record) return null;
    if (record.expiresAt && new Date() > record.expiresAt) {
      await this.repo.delete({ id: record.id });
      return null;
    }
    return record.responseJson;
  }

  /**
   * Store an idempotent result. Overwrites any existing key for the same tenant/scope.
   */
  async store(
    tenantId: string,
    scope: string,
    key: string,
    response: Record<string, any>,
    ttlSeconds = 86400,
  ): Promise<void> {
    if (!key) return;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await this.repo.save({
      tenantId,
      scope,
      key,
      responseJson: response,
      expiresAt,
    });
  }

  /**
   * Clean up expired idempotency keys.
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.repo.delete({
      expiresAt: LessThan(new Date()) as any,
    });
    return result.affected || 0;
  }
}
