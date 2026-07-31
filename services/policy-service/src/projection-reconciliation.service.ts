import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PolicyProjection } from './entities/PolicyProjection';
import { Policy } from './entities/Policy';

export interface ReconciliationResult {
  totalProjections: number;
  matched: number;
  mismatched: number;
  missing: number;
  stale: number;
  repaired: number;
  details: Array<{
    projectionId: string;
    policyId: string;
    issue: string;
    repaired: boolean;
  }>;
}

@Injectable()
export class ProjectionReconciliationService {
  private readonly logger = new Logger(ProjectionReconciliationService.name);

  constructor(
    @InjectRepository(Policy) private readonly policyRepo: Repository<Policy>,
    @InjectRepository(PolicyProjection) private readonly projectionRepo: Repository<PolicyProjection>,
  ) {}

  async reconcileProjections(
    tenantId: string,
    issuerOrganizationId: string,
    options?: { autoRepair?: boolean; batchSize?: number },
  ): Promise<ReconciliationResult> {
    const autoRepair = options?.autoRepair ?? false;
    const batchSize = options?.batchSize ?? 100;
    const result: ReconciliationResult = {
      totalProjections: 0,
      matched: 0,
      mismatched: 0,
      missing: 0,
      stale: 0,
      repaired: 0,
      details: [],
    };

    const policies = await this.policyRepo.find({
      where: { tenantId, issuerOrganizationId },
      take: batchSize,
      order: { updatedAt: 'DESC' },
    });

    for (const policy of policies) {
      const projections = await this.projectionRepo.find({
        where: { policyId: policy.policyId, tenantId },
      });

      if (projections.length === 0) {
        result.missing++;
        result.details.push({
          projectionId: 'N/A',
          policyId: policy.policyId,
          issue: 'Missing projection for policy',
          repaired: false,
        });
        continue;
      }

      for (const projection of projections) {
        result.totalProjections++;

        if (projection.status === 'superseded' || projection.status === 'revoked') {
          continue;
        }

        const projectionPayload = projection.payload || {};
        const mismatches: string[] = [];

        const projPolicyStatus = projectionPayload.policyStatus;
        if (projPolicyStatus && projPolicyStatus !== policy.status) {
          mismatches.push(`status mismatch: projection=${projPolicyStatus} vs policy=${policy.status}`);
        }
        const projPremium = projectionPayload.premiumAmount;
        if (projPremium !== undefined && String(projPremium) !== String(policy.premiumAmount)) {
          mismatches.push(`premium mismatch: projection=${projPremium} vs policy=${policy.premiumAmount}`);
        }
        const projStartDate = projectionPayload.startDate;
        if (projStartDate && new Date(projStartDate).toISOString() !== policy.startDate?.toISOString()) {
          mismatches.push('startDate mismatch');
        }
        const projEndDate = projectionPayload.endDate;
        if (projEndDate && new Date(projEndDate).toISOString() !== policy.endDate?.toISOString()) {
          mismatches.push('endDate mismatch');
        }

        const projectionAge = Date.now() - new Date(projection.updatedAt).getTime();
        const policyAge = Date.now() - new Date(policy.updatedAt).getTime();
        if (projectionAge > policyAge + 60000) {
          result.stale++;
          mismatches.push('Projection is stale relative to source policy');
        }

        if (mismatches.length === 0) {
          result.matched++;
        } else {
          result.mismatched++;
          if (autoRepair) {
            try {
              projection.payload = {
                ...projection.payload,
                policyStatus: policy.status,
                premiumAmount: policy.premiumAmount,
                startDate: policy.startDate,
                endDate: policy.endDate,
              };
              projection.sourceVersion = (projection.sourceVersion || 0) + 1;
              projection.updatedAt = new Date();
              await this.projectionRepo.save(projection);
              result.repaired++;
              result.details.push({
                projectionId: projection.projectionId,
                policyId: policy.policyId,
                issue: mismatches.join('; '),
                repaired: true,
              });
            } catch (err: any) {
              this.logger.error(`Failed to repair projection ${projection.projectionId}: ${err.message}`);
              result.details.push({
                projectionId: projection.projectionId,
                policyId: policy.policyId,
                issue: `Repair failed: ${err.message}`,
                repaired: false,
              });
            }
          } else {
            result.details.push({
              projectionId: projection.projectionId,
              policyId: policy.policyId,
              issue: mismatches.join('; '),
              repaired: false,
            });
          }
        }
      }
    }

    this.logger.log(
      `Reconciliation for tenant ${tenantId}: ${result.matched} matched, ${result.mismatched} mismatched, ${result.missing} missing, ${result.stale} stale, ${result.repaired} repaired`,
    );
    return result;
  }

  async detectDrift(tenantId: string): Promise<{ hasDrift: boolean; driftCount: number }> {
    const result = await this.reconcileProjections(tenantId, '', { autoRepair: false });
    const driftCount = result.mismatched + result.missing + result.stale;
    return { hasDrift: driftCount > 0, driftCount };
  }
}
