import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PolicyProjection } from './entities/PolicyProjection';
import { AuditService } from './audit.service';
import { OutboxPublisher } from '@insurance/shared';

export interface CreateProjectionInput {
  tenantId: string;
  brokerOrganizationId?: string | null;
  issuerOrganizationId?: string | null;
  policyId: string;
  policyNumber: string;
  uniqueCode?: string | null;
  placementId: string;
  sourceSystemId?: string | null;
  sourceVersion?: number;
  receivedAt?: Date;
  payload?: Record<string, any> | null;
  status?: 'active' | 'superseded' | 'revoked';
  correlationId?: string;
  actorUserId?: string | null;
  idempotencyKey?: string | null;
}

@Injectable()
export class PolicyProjectionService {
  constructor(
    @InjectRepository(PolicyProjection)
    private readonly repo: Repository<PolicyProjection>,
    private readonly audit: AuditService,
  ) {}

  async createProjection(input: CreateProjectionInput, manager?: any): Promise<PolicyProjection> {
    const existing = input.idempotencyKey
      ? await this.repo.findOne({ where: { tenantId: input.tenantId, idempotencyKey: input.idempotencyKey } })
      : null;
    if (existing) return existing;

    const projection = this.repo.create({
      projectionId: uuidv4(),
      tenantId: input.tenantId,
      brokerOrganizationId: input.brokerOrganizationId || null,
      issuerOrganizationId: input.issuerOrganizationId || null,
      policyId: input.policyId,
      policyNumber: input.policyNumber,
      uniqueCode: input.uniqueCode || null,
      placementId: input.placementId,
      sourceSystemId: input.sourceSystemId || 'submission-placement',
      sourceVersion: input.sourceVersion || 1,
      idempotencyKey: input.idempotencyKey || null,
      receivedAt: input.receivedAt || new Date(),
      payload: input.payload || null,
      status: input.status || 'active',
    });

    if (manager) {
      const saved = await manager.save(PolicyProjection, projection);
      return saved;
    }

    const saved = await this.repo.save(projection);
    await this.audit.record({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId || null,
      action: 'create',
      resourceType: 'policy_projection',
      resourceId: saved.projectionId,
      correlationId: input.correlationId || null,
      after: { policyId: saved.policyId, placementId: saved.placementId },
    });
    return saved;
  }

  async findByPlacement(tenantId: string, placementId: string): Promise<PolicyProjection[]> {
    return this.repo.find({ where: { tenantId, placementId }, order: { sourceVersion: 'DESC', createdAt: 'DESC' } });
  }

  async findByPolicyId(tenantId: string, policyId: string): Promise<PolicyProjection | null> {
    return this.repo.findOne({ where: { tenantId, policyId }, order: { sourceVersion: 'DESC' } });
  }

  async findByBrokerOrganization(tenantId: string, brokerOrganizationId: string, limit = 50, offset = 0): Promise<{ rows: PolicyProjection[]; total: number }> {
    const qb = this.repo.createQueryBuilder('pp')
      .where('pp.tenant_id = :tenantId', { tenantId })
      .andWhere('pp.broker_organization_id = :brokerOrgId', { brokerOrgId: brokerOrganizationId })
      .andWhere('pp.status = :status', { status: 'active' })
      .orderBy('pp.updated_at', 'DESC')
      .limit(limit)
      .offset(offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async findByIssuerOrganization(tenantId: string, issuerOrganizationId: string, limit = 50, offset = 0): Promise<{ rows: PolicyProjection[]; total: number }> {
    const qb = this.repo.createQueryBuilder('pp')
      .where('pp.tenant_id = :tenantId', { tenantId })
      .andWhere('pp.issuer_organization_id = :issuerOrgId', { issuerOrgId: issuerOrganizationId })
      .andWhere('pp.status = :status', { status: 'active' })
      .orderBy('pp.updated_at', 'DESC')
      .limit(limit)
      .offset(offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async supersedePrevious(tenantId: string, policyId: string, newVersion: number): Promise<void> {
    await this.repo.update(
      { tenantId, policyId, status: 'active' },
      { status: 'superseded' },
    );
  }
}
