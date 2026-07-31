import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Policy } from '../entities/Policy';
import { PolicyProjection } from '../entities/PolicyProjection';

@Injectable()
export class UniqueCodeSyncService {
  constructor(
    @InjectRepository(Policy)
    private readonly policyRepo: Repository<Policy>,
    @InjectRepository(PolicyProjection)
    private readonly projectionRepo: Repository<PolicyProjection>,
  ) {}

  async syncUniqueCodeToProjection(policyId: string): Promise<PolicyProjection | null> {
    const policy = await this.policyRepo.findOne({ where: { policyId } });
    if (!policy) return null;

    const projection = await this.projectionRepo.findOne({ where: { policyId } });
    if (!projection) return null;

    projection.uniqueCode = policy.uniqueCode;
    projection.status = policy.status as any;
    projection.updatedAt = new Date();
    return this.projectionRepo.save(projection);
  }

  async syncAllPendingToProjections(tenantId?: string, batchSize = 100): Promise<{ synced: number }> {
    const qb = this.policyRepo.createQueryBuilder('p')
      .where('p.unique_code IS NOT NULL AND p.unique_code != \'\'');
    if (tenantId) {
      qb.andWhere('p.tenant_id = :tenantId', { tenantId });
    }
    qb.limit(batchSize);

    const policies = await qb.getMany();
    let synced = 0;
    for (const policy of policies) {
      const result = await this.syncUniqueCodeToProjection(policy.policyId);
      if (result) synced += 1;
    }
    return { synced };
  }
}
