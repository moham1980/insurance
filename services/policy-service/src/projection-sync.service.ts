import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Policy } from './entities/Policy';
import { PolicyProjection } from './entities/PolicyProjection';
import { OutboxPublisher } from '@insurance/shared';

export interface InsurerProjectionPayload {
  projectionId?: string;
  policyId: string;
  policyNumber: string;
  uniqueCode?: string | null;
  status?: string;
  startDate?: string;
  endDate?: string;
  premiumAmount?: number;
  coverages?: Record<string, any>;
  installments?: Record<string, any>;
  metadata?: Record<string, any>;
  sourceVersion?: number;
}

@Injectable()
export class ProjectionSyncService {
  private readonly logger = new Logger(ProjectionSyncService.name);

  constructor(
    @InjectRepository(Policy) private readonly policyRepo: Repository<Policy>,
    @InjectRepository(PolicyProjection) private readonly projectionRepo: Repository<PolicyProjection>,
    private readonly dataSource: DataSource,
  ) {}

  async syncProjection(params: {
    tenantId: string;
    brokerOrganizationId: string;
    issuerOrganizationId: string;
    sourceSystemId: string;
    payload: InsurerProjectionPayload;
    correlationId: string;
  }): Promise<PolicyProjection> {
    const policy = await this.policyRepo.findOne({ where: { policyId: params.payload.policyId } });
    if (!policy) {
      throw new Error('Policy not found for projection sync');
    }

    return await this.dataSource.transaction(async (manager) => {
      const projectionRepo = manager.getRepository(PolicyProjection);
      const outbox = new OutboxPublisher(manager);

      const incomingVersion = (params.payload as any).sourceVersion ?? 1;

      // Find all existing projections for this policy + source system
      const existingProjections = await projectionRepo.find({
        where: { policyId: params.payload.policyId, sourceSystemId: params.sourceSystemId },
        order: { sourceVersion: 'DESC' as any },
      });

      const latestExisting = existingProjections[0];

      // Version conflict detection: if incoming version is older than the latest, reject it
      if (latestExisting && incomingVersion < latestExisting.sourceVersion) {
        this.logger.warn(
          `Stale projection received for policy ${params.payload.policyId} from ${params.sourceSystemId}: ` +
          `incoming version ${incomingVersion} < latest ${latestExisting.sourceVersion}, skipping`,
        );
        return latestExisting;
      }

      // Supersede all existing projections
      if (existingProjections.length > 0) {
        for (const proj of existingProjections) {
          if (proj.status === 'active') {
            proj.status = 'superseded';
            await projectionRepo.save(proj);
          }
        }
      }

      const projection = new PolicyProjection();
      projection.projectionId = uuidv4();
      projection.tenantId = params.tenantId;
      projection.brokerOrganizationId = params.brokerOrganizationId;
      projection.issuerOrganizationId = params.issuerOrganizationId;
      projection.policyId = params.payload.policyId;
      projection.policyNumber = params.payload.policyNumber;
      projection.uniqueCode = params.payload.uniqueCode || null;
      projection.placementId = policy.placementId || '00000000-0000-0000-0000-000000000000';
      projection.receivedAt = new Date();
      projection.sourceVersion = incomingVersion;
      projection.idempotencyKey = `${params.sourceSystemId}:${params.payload.policyId}:${params.payload.policyNumber}:v${incomingVersion}`;
      projection.status = this.normalizeStatus(params.payload.status);
      projection.payload = {
        coverages: params.payload.coverages,
        installments: params.payload.installments,
        premiumAmount: params.payload.premiumAmount,
        startDate: params.payload.startDate,
        endDate: params.payload.endDate,
        metadata: params.payload.metadata,
      };
      projection.sourceSystemId = params.sourceSystemId;

      await projectionRepo.save(projection);

      // Reconcile policy totals if the source of truth is the insurer
      if (typeof params.payload.premiumAmount === 'number') {
        policy.premiumAmount = params.payload.premiumAmount;
        policy.totalPayableAmount = policy.premiumAmount + (policy.taxesAmount || 0) + (policy.fees || []).reduce((sum, f: any) => sum + (f.amount || 0), 0);
        await manager.save(policy);
      }

      await outbox.publish({
        topic: 'insurance.policy.projection.synced',
        eventType: 'PolicyProjectionSynchronized',
        eventVersion: 1,
        correlationId: params.correlationId,
        tenantId: params.tenantId,
        subject: { policyId: policy.policyId, projectionId: projection.projectionId },
        payload: {
          policyId: policy.policyId,
          projectionId: projection.projectionId,
          sourceSystemId: params.sourceSystemId,
          premiumAmount: params.payload.premiumAmount,
          status: projection.status,
        },
      });

      return projection;
    });
  }

  async listProjections(policyId: string, tenantId?: string): Promise<PolicyProjection[]> {
    const where: any = { policyId };
    if (tenantId) where.tenantId = tenantId;
    return this.projectionRepo.find({ where, order: { createdAt: 'DESC' as any } });
  }

  private normalizeStatus(status?: string): 'active' | 'superseded' | 'revoked' {
    if (status === 'superseded' || status === 'revoked') return status;
    return 'active';
  }
}
