import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Claim } from './entities/Claim';
import { OutboxPublisher } from '@insurance/shared';
import { DataSource } from 'typeorm';

@Injectable()
export class ClaimsService {
  private outboxPublisher: OutboxPublisher;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Claim) private readonly claimRepo: Repository<Claim>
  ) {
    this.outboxPublisher = new OutboxPublisher(this.dataSource);
  }

  async createClaim(params: {
    correlationId: string;
    policyId: string;
    claimantPartyId: string;
    lossDate: string;
    lossType: string;
    description?: string;
  }): Promise<Claim> {
    const claimNumber = `CLM-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const claim = this.claimRepo.create({
      claimId: uuidv4(),
      claimNumber,
      policyId: params.policyId,
      claimantPartyId: params.claimantPartyId,
      lossDate: new Date(params.lossDate),
      lossType: params.lossType,
      description: params.description || null,
      status: 'registered',
      requiresHumanTriage: true,
    });

    await this.claimRepo.save(claim);

    await this.outboxPublisher.publish({
      topic: 'insurance.claim.registered',
      eventType: 'ClaimRegistered',
      eventVersion: 1,
      correlationId: params.correlationId,
      subject: {
        claimId: claim.claimId,
        claimNumber: claim.claimNumber,
        policyId: claim.policyId,
      },
      payload: {
        claimId: claim.claimId,
        claimNumber: claim.claimNumber,
        policyId: claim.policyId,
        claimantPartyId: claim.claimantPartyId,
        lossDate: claim.lossDate.toISOString(),
        lossType: claim.lossType,
        status: claim.status,
        requiresHumanTriage: claim.requiresHumanTriage,
        createdAt: claim.createdAt?.toISOString?.() ?? new Date().toISOString(),
      },
    });

    return claim;
  }

  async getClaim(claimId: string): Promise<Claim | null> {
    return this.claimRepo.findOne({ where: { claimId } });
  }

  async listClaims(params: {
    policyId?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: Claim[]; total: number }> {
    const qb = this.claimRepo.createQueryBuilder('claim');

    if (params.policyId) {
      qb.andWhere('claim.policy_id = :policyId', { policyId: params.policyId });
    }

    if (params.status) {
      qb.andWhere('claim.status = :status', { status: params.status });
    }

    qb.orderBy('claim.created_at', 'DESC')
      .limit(params.limit)
      .offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  private async publishClaimEvent(params: {
    correlationId: string;
    topic: string;
    eventType: string;
    claim: Claim;
    payload: Record<string, unknown>;
  }): Promise<void> {
    await this.outboxPublisher.publish({
      topic: params.topic,
      eventType: params.eventType,
      eventVersion: 1,
      correlationId: params.correlationId,
      subject: {
        claimId: params.claim.claimId,
        claimNumber: params.claim.claimNumber,
        policyId: params.claim.policyId,
      },
      payload: {
        claimId: params.claim.claimId,
        claimNumber: params.claim.claimNumber,
        policyId: params.claim.policyId,
        status: params.claim.status,
        updatedAt: params.claim.updatedAt?.toISOString?.() ?? new Date().toISOString(),
        ...params.payload,
      },
    });
  }

  async assessClaim(params: { correlationId: string; claimId: string; assessedAmount: number }): Promise<Claim | null> {
    const claim = await this.getClaim(params.claimId);
    if (!claim) return null;

    claim.assessedAmount = params.assessedAmount;
    claim.status = 'assessed';
    await this.claimRepo.save(claim);

    await this.publishClaimEvent({
      correlationId: params.correlationId,
      topic: 'insurance.claim.assessed',
      eventType: 'ClaimAssessed',
      claim,
      payload: { assessedAmount: params.assessedAmount },
    });

    return claim;
  }

  async approveClaim(params: { correlationId: string; claimId: string; approvedAmount: number }): Promise<Claim | null> {
    const claim = await this.getClaim(params.claimId);
    if (!claim) return null;

    claim.approvedAmount = params.approvedAmount;
    claim.status = 'approved';
    await this.claimRepo.save(claim);

    await this.publishClaimEvent({
      correlationId: params.correlationId,
      topic: 'insurance.claim.approved',
      eventType: 'ClaimApproved',
      claim,
      payload: { approvedAmount: params.approvedAmount },
    });

    return claim;
  }

  async rejectClaim(params: { correlationId: string; claimId: string; reason: string }): Promise<Claim | null> {
    const claim = await this.getClaim(params.claimId);
    if (!claim) return null;

    claim.status = 'rejected';
    await this.claimRepo.save(claim);

    await this.publishClaimEvent({
      correlationId: params.correlationId,
      topic: 'insurance.claim.rejected',
      eventType: 'ClaimRejected',
      claim,
      payload: { reason: params.reason },
    });

    return claim;
  }

  async payClaim(params: { correlationId: string; claimId: string; paidAmount: number }): Promise<Claim | null> {
    const claim = await this.getClaim(params.claimId);
    if (!claim) return null;

    claim.paidAmount = params.paidAmount;
    claim.status = 'paid';
    await this.claimRepo.save(claim);

    await this.publishClaimEvent({
      correlationId: params.correlationId,
      topic: 'insurance.claim.paid',
      eventType: 'ClaimPaid',
      claim,
      payload: { paidAmount: params.paidAmount },
    });

    return claim;
  }

  async closeClaim(params: { correlationId: string; claimId: string }): Promise<Claim | null> {
    const claim = await this.getClaim(params.claimId);
    if (!claim) return null;

    claim.status = 'closed';
    await this.claimRepo.save(claim);

    await this.publishClaimEvent({
      correlationId: params.correlationId,
      topic: 'insurance.claim.closed',
      eventType: 'ClaimClosed',
      claim,
      payload: {},
    });

    return claim;
  }
}
