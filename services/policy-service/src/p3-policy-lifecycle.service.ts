import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Policy } from './entities/Policy';
import { PolicyCoverage } from './entities/PolicyCoverage';
import { PolicyParty } from './entities/PolicyParty';
import { PolicyDocument } from './entities/PolicyDocument';
import { PolicyChange } from './entities/PolicyChange';
import { PolicyRenewal } from './entities/PolicyRenewal';
import { Endorsement } from './entities/Endorsement';
import { EndorsementChange } from './entities/EndorsementChange';
import { OutboxPublisher } from '@insurance/shared';

@Injectable()
export class P3PolicyLifecycleService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getPolicyWithDetails(policyId: string, tenantId?: string) {
    const policyRepo = this.dataSource.getRepository(Policy);
    const coverageRepo = this.dataSource.getRepository(PolicyCoverage);
    const partyRepo = this.dataSource.getRepository(PolicyParty);
    const documentRepo = this.dataSource.getRepository(PolicyDocument);

    const where: any = { policyId };
    if (tenantId) where.tenantId = tenantId;

    const policy = await policyRepo.findOne({ where });
    if (!policy) return null;

    const [coverages, parties, documents] = await Promise.all([
      coverageRepo.find({ where: { policyId, status: 'active' as any } }),
      partyRepo.find({ where: { policyId } }),
      documentRepo.find({ where: { policyId } }),
    ]);

    return { policy, coverages, parties, documents };
  }

  async patchPolicy(params: {
    policyId: string;
    tenantId?: string;
    actorUserId?: string | null;
    patch: Record<string, any>;
    correlationId: string;
  }): Promise<Policy | null> {
    return await this.dataSource.transaction(async (manager) => {
      const policyRepo = manager.getRepository(Policy);
      const changeRepo = manager.getRepository(PolicyChange);
      const outbox = new OutboxPublisher(manager);

      const where: any = { policyId: params.policyId };
      if (params.tenantId) where.tenantId = params.tenantId;

      const policy = await policyRepo.findOne({ where });
      if (!policy) return null;

      const before: Record<string, any> = {};
      const after: Record<string, any> = {};

      for (const [key, value] of Object.entries(params.patch)) {
        if (['productId', 'productVersion', 'salesChannelType', 'customerPartyId', 'recordOwnerOrganizationId', 'authoritativeTenantId', 'sourceSystemId', 'externalPolicyId', 'placementId', 'marketerPartyId', 'subAgentPartyId'].includes(key)) {
          const k = key as keyof Policy;
          before[key] = policy[k];
          (policy as any)[k] = value;
          after[key] = value;
        }
      }

      policy.updatedAt = new Date();
      await policyRepo.save(policy);

      const change = changeRepo.create({
        changeId: uuidv4(),
        tenantId: policy.tenantId,
        policyId: params.policyId,
        type: 'endorsement',
        actorUserId: params.actorUserId || null,
        correlationId: params.correlationId,
        before,
        after,
      });
      await changeRepo.save(change);

      await outbox.publish({
        topic: 'insurance.policy.updated',
        eventType: 'PolicyUpdated',
        eventVersion: 1,
        correlationId: params.correlationId,
        tenantId: policy.tenantId || undefined,
        subject: { policyId: params.policyId },
        payload: { policyId: params.policyId, before, after },
      });

      return policy;
    });
  }

  async createEndorsement(params: {
    policyId: string;
    tenantId?: string;
    endorsementType: Endorsement['endorsementType'];
    effectiveDate: Date;
    requestedByPartyId: string;
    reason?: string;
    payload: Record<string, any>;
    actorUserId?: string | null;
    correlationId: string;
  }): Promise<Endorsement | null> {
    return await this.dataSource.transaction(async (manager) => {
      const policyRepo = manager.getRepository(Policy);
      const endorsementRepo = manager.getRepository(Endorsement);
      const outbox = new OutboxPublisher(manager);

      const where: any = { policyId: params.policyId };
      if (params.tenantId) where.tenantId = params.tenantId;

      const policy = await policyRepo.findOne({ where });
      if (!policy) return null;

      if (policy.status !== 'active') {
        throw new Error(`Endorsement can only be created on a policy with status 'active', current status: ${policy.status}`);
      }

      const endorsement = new Endorsement();
      endorsement.endorsementId = uuidv4();
      endorsement.tenantId = policy.tenantId;
      endorsement.policyId = params.policyId;
      endorsement.endorsementType = params.endorsementType;
      endorsement.effectiveDate = params.effectiveDate;
      endorsement.requestedByPartyId = params.requestedByPartyId;
      endorsement.premiumDeltaAmount = Number(params.payload?.premiumDeltaAmount || 0);
      endorsement.premiumDeltaCurrency = params.payload?.premiumDeltaCurrency || policy.premiumCurrency || 'IRR';
      endorsement.taxDeltaAmount = Number(params.payload?.taxDeltaAmount || 0);
      endorsement.taxDeltaCurrency = params.payload?.taxDeltaCurrency || policy.premiumCurrency || 'IRR';
      endorsement.status = 'draft';
      endorsement.reason = params.reason || null;
      endorsement.metadata = { requestPayload: params.payload };

      await endorsementRepo.save(endorsement);

      await outbox.publish({
        topic: 'insurance.policy.endorsement.drafted',
        eventType: 'EndorsementDrafted',
        eventVersion: 1,
        correlationId: params.correlationId,
        tenantId: policy.tenantId || undefined,
        subject: { policyId: params.policyId, endorsementId: endorsement.endorsementId },
        payload: { policyId: params.policyId, endorsementId: endorsement.endorsementId, endorsementType: endorsement.endorsementType, effectiveDate: endorsement.effectiveDate },
      });

      return endorsement;
    });
  }

  async applyEndorsement(params: {
    endorsementId: string;
    tenantId?: string;
    actorUserId?: string | null;
    approvedByPartyId?: string;
    correlationId: string;
  }): Promise<Endorsement | null> {
    return await this.dataSource.transaction(async (manager) => {
      const policyRepo = manager.getRepository(Policy);
      const endorsementRepo = manager.getRepository(Endorsement);
      const changeRepo = manager.getRepository(EndorsementChange);
      const outbox = new OutboxPublisher(manager);

      const where: any = { endorsementId: params.endorsementId };
      if (params.tenantId) where.tenantId = params.tenantId;

      const endorsement = await endorsementRepo.findOne({ where });
      if (!endorsement) return null;

      if (endorsement.status !== 'draft' && endorsement.status !== 'submitted') {
        throw new Error('Endorsement cannot be applied in current state');
      }

      const policy = await policyRepo.findOne({ where: { policyId: endorsement.policyId } });
      if (!policy) throw new Error('Policy not found');

      const before: Record<string, any> = { premiumAmount: policy.premiumAmount, totalPayableAmount: policy.totalPayableAmount, taxesAmount: policy.taxesAmount };
      const after: Record<string, any> = {
        premiumAmount: policy.premiumAmount + (endorsement.premiumDeltaAmount || 0),
        totalPayableAmount: policy.totalPayableAmount + (endorsement.premiumDeltaAmount || 0) + (endorsement.taxDeltaAmount || 0),
        taxesAmount: policy.taxesAmount + (endorsement.taxDeltaAmount || 0),
      };

      policy.premiumAmount = after.premiumAmount;
      policy.totalPayableAmount = after.totalPayableAmount;
      policy.taxesAmount = after.taxesAmount;
      policy.updatedAt = new Date();
      policy.status = 'endorsed';
      await policyRepo.save(policy);

      endorsement.status = 'applied';
      endorsement.approvedByPartyId = params.approvedByPartyId || null;
      endorsement.appliedAt = new Date();
      await endorsementRepo.save(endorsement);

      for (const [field, value] of Object.entries(after)) {
        const ec = new EndorsementChange();
        ec.changeId = uuidv4();
        ec.tenantId = policy.tenantId;
        ec.endorsementId = endorsement.endorsementId;
        ec.field = field;
        ec.oldValue = before[field];
        ec.newValue = value;
        ec.reason = 'Endorsement applied';
        await changeRepo.save(ec);
      }

      await outbox.publish({
        topic: 'insurance.policy.endorsement.applied',
        eventType: 'EndorsementApplied',
        eventVersion: 1,
        correlationId: params.correlationId,
        tenantId: policy.tenantId || undefined,
        subject: { policyId: policy.policyId, endorsementId: endorsement.endorsementId },
        payload: { policyId: policy.policyId, endorsementId: endorsement.endorsementId, before, after },
      });

      await outbox.publish({
        topic: 'insurance.policy.endorsed',
        eventType: 'PolicyEndorsed',
        eventVersion: 1,
        correlationId: params.correlationId,
        tenantId: policy.tenantId || undefined,
        subject: { policyId: policy.policyId, endorsementId: endorsement.endorsementId },
        payload: {
          policyId: policy.policyId,
          endorsementId: endorsement.endorsementId,
          endorsementType: endorsement.endorsementType,
          premiumDeltaAmount: endorsement.premiumDeltaAmount,
          taxDeltaAmount: endorsement.taxDeltaAmount,
          currency: endorsement.premiumDeltaCurrency || policy.premiumCurrency || 'IRR',
          before,
          after,
        },
      });

      return endorsement;
    });
  }

  async submitEndorsement(params: {
    endorsementId: string;
    tenantId?: string;
    actorUserId?: string | null;
    correlationId: string;
  }): Promise<Endorsement | null> {
    return await this.dataSource.transaction(async (manager) => {
      const endorsementRepo = manager.getRepository(Endorsement);
      const outbox = new OutboxPublisher(manager);

      const where: any = { endorsementId: params.endorsementId };
      if (params.tenantId) where.tenantId = params.tenantId;

      const endorsement = await endorsementRepo.findOne({ where });
      if (!endorsement) return null;

      if (endorsement.status !== 'draft') {
        const err: any = new Error('Endorsement can only be submitted from draft state');
        err.code = 'INVALID_STATE';
        throw err;
      }

      endorsement.status = 'submitted';
      endorsement.updatedAt = new Date();
      await endorsementRepo.save(endorsement);

      await outbox.publish({
        topic: 'insurance.policy.endorsement.submitted',
        eventType: 'EndorsementSubmitted',
        eventVersion: 1,
        correlationId: params.correlationId,
        tenantId: endorsement.tenantId || undefined,
        subject: { policyId: endorsement.policyId, endorsementId: endorsement.endorsementId },
        payload: { policyId: endorsement.policyId, endorsementId: endorsement.endorsementId, submittedBy: params.actorUserId },
      });

      return endorsement;
    });
  }

  async approveEndorsement(params: {
    endorsementId: string;
    tenantId?: string;
    actorUserId?: string | null;
    approvedByPartyId: string;
    correlationId: string;
  }): Promise<Endorsement | null> {
    return await this.dataSource.transaction(async (manager) => {
      const endorsementRepo = manager.getRepository(Endorsement);
      const outbox = new OutboxPublisher(manager);

      const where: any = { endorsementId: params.endorsementId };
      if (params.tenantId) where.tenantId = params.tenantId;

      const endorsement = await endorsementRepo.findOne({ where });
      if (!endorsement) return null;

      if (endorsement.status !== 'submitted') {
        const err: any = new Error('Endorsement can only be approved from submitted state');
        err.code = 'INVALID_STATE';
        throw err;
      }

      endorsement.status = 'approved';
      endorsement.approvedByPartyId = params.approvedByPartyId;
      endorsement.updatedAt = new Date();
      await endorsementRepo.save(endorsement);

      await outbox.publish({
        topic: 'insurance.policy.endorsement.approved',
        eventType: 'EndorsementApproved',
        eventVersion: 1,
        correlationId: params.correlationId,
        tenantId: endorsement.tenantId || undefined,
        subject: { policyId: endorsement.policyId, endorsementId: endorsement.endorsementId },
        payload: { policyId: endorsement.policyId, endorsementId: endorsement.endorsementId, approvedBy: params.approvedByPartyId },
      });

      return endorsement;
    });
  }

  async rejectEndorsement(params: {
    endorsementId: string;
    tenantId?: string;
    actorUserId?: string | null;
    rejectionReason: string;
    correlationId: string;
  }): Promise<Endorsement | null> {
    return await this.dataSource.transaction(async (manager) => {
      const endorsementRepo = manager.getRepository(Endorsement);
      const outbox = new OutboxPublisher(manager);

      const where: any = { endorsementId: params.endorsementId };
      if (params.tenantId) where.tenantId = params.tenantId;

      const endorsement = await endorsementRepo.findOne({ where });
      if (!endorsement) return null;

      if (endorsement.status !== 'submitted' && endorsement.status !== 'draft') {
        const err: any = new Error('Endorsement can only be rejected from submitted or draft state');
        err.code = 'INVALID_STATE';
        throw err;
      }

      if (!params.rejectionReason) {
        const err: any = new Error('Rejection reason is required');
        err.code = 'VALIDATION_ERROR';
        throw err;
      }

      endorsement.status = 'rejected';
      endorsement.rejectedAt = new Date();
      endorsement.rejectionReason = params.rejectionReason;
      endorsement.updatedAt = new Date();
      await endorsementRepo.save(endorsement);

      await outbox.publish({
        topic: 'insurance.policy.endorsement.rejected',
        eventType: 'EndorsementRejected',
        eventVersion: 1,
        correlationId: params.correlationId,
        tenantId: endorsement.tenantId || undefined,
        subject: { policyId: endorsement.policyId, endorsementId: endorsement.endorsementId },
        payload: { policyId: endorsement.policyId, endorsementId: endorsement.endorsementId, rejectionReason: params.rejectionReason },
      });

      return endorsement;
    });
  }

  async getHistory(policyId: string, tenantId?: string, limit = 50, offset = 0) {
    const changeRepo = this.dataSource.getRepository(PolicyChange);
    const renewalRepo = this.dataSource.getRepository(PolicyRenewal);
    const endorsementRepo = this.dataSource.getRepository(Endorsement);

    const where: any = { policyId };
    if (tenantId) where.tenantId = tenantId;

    const [changes, totalChanges] = await changeRepo.findAndCount({ where, take: limit, skip: offset, order: { createdAt: 'DESC' as any } });
    const [renewals, totalRenewals] = await renewalRepo.findAndCount({ where, take: limit, skip: offset, order: { createdAt: 'DESC' as any } });
    const [endorsements, totalEndorsements] = await endorsementRepo.findAndCount({ where, take: limit, skip: offset, order: { createdAt: 'DESC' as any } });

    return {
      changes,
      renewals,
      endorsements,
      total: totalChanges + totalRenewals + totalEndorsements,
    };
  }

  async getCoverages(policyId: string, tenantId?: string) {
    const coverageRepo = this.dataSource.getRepository(PolicyCoverage);
    const where: any = { policyId, status: 'active' as any };
    if (tenantId) where.tenantId = tenantId;
    return coverageRepo.find({ where, order: { coverageCode: 'ASC' as any } });
  }

  async createCoverage(params: {
    tenantId?: string;
    policyId: string;
    coverageCode: string;
    limitAmount: number;
    limitCurrency: string;
    deductibleAmount: number;
    deductibleCurrency: string;
    premiumAmount: number;
    premiumCurrency: string;
    correlationId: string;
  }): Promise<PolicyCoverage> {
    const coverageRepo = this.dataSource.getRepository(PolicyCoverage);
    const coverage = coverageRepo.create({
      policyCoverageId: uuidv4(),
      tenantId: params.tenantId || null,
      policyId: params.policyId,
      coverageCode: params.coverageCode,
      limitAmount: params.limitAmount,
      limitCurrency: params.limitCurrency,
      deductibleAmount: params.deductibleAmount,
      deductibleCurrency: params.deductibleCurrency,
      premiumAmount: params.premiumAmount,
      premiumCurrency: params.premiumCurrency,
      status: 'active',
    });
    return coverageRepo.save(coverage);
  }
}
