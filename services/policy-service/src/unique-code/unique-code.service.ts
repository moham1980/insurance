import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Policy } from '../entities/Policy';
import { OutboxPublisher } from '@insurance/shared';

export interface UniqueCodeAssignmentResult {
  policy: Policy;
  isDuplicate: boolean;
  previousUniqueCode?: string | null;
}

@Injectable()
export class UniqueCodeService {
  private readonly logger = new Logger(UniqueCodeService.name);

  constructor(
    @InjectRepository(Policy)
    private readonly policyRepo: Repository<Policy>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Assign a unique code to a policy only if it is authoritative and not already
   * in use by another policy in the same tenant (or authoritative tenant).
   */
  async assignUniqueCode(params: {
    policyId: string;
    uniqueCode: string;
    source: 'sanhab' | 'manual';
    actorUserId?: string | null;
    tenantId?: string;
    sanhabSubmissionId?: string | null;
    sanhabResponse?: Record<string, any> | null;
  }): Promise<UniqueCodeAssignmentResult> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Policy);

      const policy = await repo.findOne({
        where: { policyId: params.policyId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!policy) {
        const err: any = new Error('Policy not found');
        err.code = 'NOT_FOUND';
        throw err;
      }

      if (policy.tenantId !== (params.tenantId ?? null)) {
        const err: any = new Error('Tenant mismatch');
        err.code = 'TENANT_MISMATCH';
        throw err;
      }

      // Authoritative boundary: tenant or, when set, authoritativeTenantId.
      const authorityKey = policy.authoritativeTenantId || policy.tenantId || '';

      const existingWithSameCode = await repo
        .createQueryBuilder('p')
        .where('p.unique_code = :uniqueCode', { uniqueCode: params.uniqueCode })
        .andWhere('p.policy_id != :policyId', { policyId: params.policyId })
        .andWhere(
          'COALESCE(p.authoritative_tenant_id, p.tenant_id) = :authorityKey',
          { authorityKey },
        )
        .getOne();

      if (existingWithSameCode) {
        const duplicate = await repo.preload({ policyId: policy.policyId });
        if (!duplicate) {
          const err: any = new Error('Policy not found');
          err.code = 'NOT_FOUND';
          throw err;
        }
        return { policy: duplicate, isDuplicate: true, previousUniqueCode: policy.uniqueCode };
      }

      const previousUniqueCode = policy.uniqueCode;
      policy.uniqueCode = params.uniqueCode;
      policy.sanhabStatus = params.source === 'sanhab' ? 'confirmed' : 'confirmed';
      if (params.sanhabSubmissionId) {
        policy.sanhabSubmissionId = params.sanhabSubmissionId;
      }
      if (params.sanhabResponse) {
        policy.sanhabResponse = params.sanhabResponse;
      }
      policy.updatedAt = new Date();

      const saved = await repo.save(policy);

      try {
        const outbox = new OutboxPublisher(manager);
        await outbox.publish({
          topic: 'insurance.policy.events',
          eventType: 'UniqueCodeAssigned',
          eventVersion: 1,
          correlationId: uuidv4(),
          tenantId: params.tenantId || 'unknown',
          subject: { policyId: saved.policyId },
          payload: {
            policyId: saved.policyId,
            uniqueCode: saved.uniqueCode,
            source: params.source,
            previousUniqueCode,
            timestamp: new Date().toISOString(),
          },
          producer: 'policy-service',
          dataClassification: 'INTERNAL',
        });
      } catch (err: any) {
        this.logger.error('Failed to publish UniqueCodeAssigned event', { error: err?.message, policyId: saved.policyId });
      }

      return { policy: saved, isDuplicate: false, previousUniqueCode };
    });
  }

  async findPoliciesWithoutUniqueCode(
    tenantId?: string,
    limit = 50,
    offset = 0,
    distributionOrganizationId?: string,
  ): Promise<{ rows: Policy[]; total: number }> {
    const qb = this.policyRepo.createQueryBuilder('p');
    if (tenantId) {
      qb.andWhere('p.tenant_id = :tenantId', { tenantId });
    }
    if (distributionOrganizationId) {
      qb.andWhere('p.distribution_organization_id = :distributionOrganizationId', { distributionOrganizationId });
    }
    qb.andWhere('(p.unique_code IS NULL OR p.unique_code = \'\')');
    qb.orderBy('p.created_at', 'DESC').limit(limit).offset(offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async findDuplicateUniqueCodes(tenantId?: string): Promise<
    { uniqueCode: string; tenantId: string; policyIds: string[]; count: number }[]
  > {
    const qb = this.policyRepo
      .createQueryBuilder('p')
      .select('p.unique_code', 'uniqueCode')
      .addSelect('COALESCE(p.authoritative_tenant_id, p.tenant_id)', 'tenantId')
      .addSelect('ARRAY_AGG(p.policy_id)', 'policyIds')
      .addSelect('COUNT(*)', 'count')
      .where('p.unique_code IS NOT NULL AND p.unique_code != \'\'');

    if (tenantId) {
      qb.andWhere('(p.tenant_id = :tenantId OR p.authoritative_tenant_id = :tenantId)', { tenantId });
    }

    qb.groupBy('p.unique_code, COALESCE(p.authoritative_tenant_id, p.tenant_id)')
      .having('COUNT(*) > 1');

    const raw = await qb.getRawMany();
    return raw.map((r: any) => ({
      uniqueCode: r.uniqueCode,
      tenantId: r.tenantId,
      policyIds: Array.isArray(r.policyIds) ? r.policyIds : [r.policyIds],
      count: Number(r.count),
    }));
  }

  generateSanhabSubmissionId(): string {
    return uuidv4();
  }
}
