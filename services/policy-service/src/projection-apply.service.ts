import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PolicyProjection } from './entities/PolicyProjection';

export interface ApplyProjectionInput {
  policyId: string;
  policyNumber: string;
  sourceTenantId: string;
  sourceOrganizationId: string;
  sourceSystemId: string;
  sourceVersion: number;
  externalId?: string;
  tenantId: string;
  payload: Record<string, any>;
  correlationId: string;
}

export interface ApplyProjectionResult {
  projectionId: string;
  applied: boolean;
  skipped: boolean;
  reason?: string;
  sourceVersion: number;
}

function markAsProjection(
  entity: any,
  sourceTenantId: string,
  sourceOrgId: string,
  sourceSystemId: string,
  externalId?: string,
): void {
  entity.authoritativeTenantId = sourceTenantId;
  entity.recordOwnerOrganizationId = sourceOrgId;
  entity.sourceSystemId = sourceSystemId;
  if (externalId) entity.externalId = externalId;
  entity.federationStatus = 'projected';
}

@Injectable()
export class ProjectionApplyService {
  private readonly logger = new Logger(ProjectionApplyService.name);

  constructor(
    @InjectRepository(PolicyProjection)
    private readonly projectionRepo: Repository<PolicyProjection>,
  ) {}

  async applyProjection(input: ApplyProjectionInput): Promise<ApplyProjectionResult> {
    const existing = await this.projectionRepo.findOne({
      where: { policyId: input.policyId, tenantId: input.tenantId },
      order: { sourceVersion: 'DESC' },
    });

    if (existing && existing.sourceVersion >= input.sourceVersion) {
      this.logger.debug(
        `Skipping projection for policy ${input.policyId}: existing version ${existing.sourceVersion} >= incoming ${input.sourceVersion}`,
      );
      return {
        projectionId: existing.projectionId,
        applied: false,
        skipped: true,
        reason: `Incoming sourceVersion ${input.sourceVersion} is not newer than existing ${existing.sourceVersion}`,
        sourceVersion: existing.sourceVersion,
      };
    }

    if (existing) {
      existing.status = 'superseded';
      await this.projectionRepo.save(existing);
    }

    const projection = this.projectionRepo.create({
      projectionId: undefined,
      policyId: input.policyId,
      policyNumber: input.policyNumber,
      tenantId: input.tenantId,
      sourceVersion: input.sourceVersion,
      status: 'active',
      payload: input.payload,
      receivedAt: new Date(),
      updatedAt: new Date(),
    });

    markAsProjection(
      projection,
      input.sourceTenantId,
      input.sourceOrganizationId,
      input.sourceSystemId,
      input.externalId,
    );

    const saved = await this.projectionRepo.save(projection);

    this.logger.log(
      `Applied projection for policy ${input.policyId} (v${input.sourceVersion}) to tenant ${input.tenantId} [correlationId=${input.correlationId}]`,
    );

    return {
      projectionId: saved.projectionId,
      applied: true,
      skipped: false,
      sourceVersion: input.sourceVersion,
    };
  }

  async applyBatch(inputs: ApplyProjectionInput[]): Promise<ApplyProjectionResult[]> {
    const results: ApplyProjectionResult[] = [];
    for (const input of inputs) {
      try {
        const result = await this.applyProjection(input);
        results.push(result);
      } catch (err: any) {
        this.logger.error(
          `Failed to apply projection for policy ${input.policyId}: ${err.message}`,
        );
        results.push({
          projectionId: '',
          applied: false,
          skipped: false,
          reason: err.message,
          sourceVersion: input.sourceVersion,
        });
      }
    }
    return results;
  }

  async getActiveProjection(
    policyId: string,
    tenantId: string,
  ): Promise<PolicyProjection | null> {
    return this.projectionRepo.findOne({
      where: { policyId, tenantId, status: 'active' },
      order: { sourceVersion: 'DESC' },
    });
  }

  async isProjectionStale(
    policyId: string,
    tenantId: string,
    maxAgeSeconds: number = 60,
  ): Promise<boolean> {
    const projection = await this.getActiveProjection(policyId, tenantId);
    if (!projection) return true;
    const ageSeconds = (Date.now() - new Date(projection.updatedAt).getTime()) / 1000;
    return ageSeconds > maxAgeSeconds;
  }
}
