import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OutboxPublisher } from '@insurance/shared';
import { FraudCase } from './entities/FraudCase';

@Injectable()
export class FraudService {
  private outboxPublisher: OutboxPublisher;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(FraudCase) private readonly fraudRepo: Repository<FraudCase>
  ) {
    this.outboxPublisher = new OutboxPublisher(this.dataSource);
  }

  async computeScore(params: {
    correlationId: string;
    claimId: string;
    claimNumber: string;
    lossType: string;
    policyId?: string;
  }): Promise<{ score: number; signals: string[]; holdClaim: boolean; threshold: number }> {
    const signals: string[] = [];
    let score = 0;

    if (params.lossType === 'AUTO') {
      score += 30;
      signals.push('AUTO_CLAIM');
    }
    if (params.lossType === 'PROPERTY') {
      score += 20;
      signals.push('PROPERTY_CLAIM');
    }
    if (Math.random() > 0.7) {
      score += 25;
      signals.push('HIGH_VALUE_CLAIM');
    }

    const threshold = 50;
    const holdClaim = score >= threshold;

    await this.outboxPublisher.publish({
      topic: 'insurance.fraud.score_computed',
      eventType: 'FraudScoreComputed',
      eventVersion: 1,
      correlationId: params.correlationId,
      subject: {
        claimId: params.claimId,
        claimNumber: params.claimNumber,
      },
      payload: {
        claimId: params.claimId,
        claimNumber: params.claimNumber,
        policyId: params.policyId,
        score,
        signals,
        holdClaim,
        threshold,
      },
    });

    return { score, signals, holdClaim, threshold };
  }

  async openCase(params: {
    correlationId: string;
    claimId: string;
    claimNumber?: string;
    score?: number;
    signals?: string[];
    notes?: string;
    assignedTo?: string;
  }): Promise<FraudCase> {
    const fraudCase = this.fraudRepo.create({
      fraudCaseId: uuidv4(),
      claimId: params.claimId,
      claimNumber: params.claimNumber || `CLM-${params.claimId.slice(0, 8)}`,
      score: params.score ?? 75,
      signals: params.signals || ['MANUAL_REVIEW'],
      status: 'open',
      assignedTo: params.assignedTo || null,
      holdClaim: true,
      notes: params.notes || null,
    });

    await this.fraudRepo.save(fraudCase);

    await this.outboxPublisher.publish({
      topic: 'insurance.fraud.case_opened',
      eventType: 'FraudCaseOpened',
      eventVersion: 1,
      correlationId: params.correlationId,
      subject: {
        fraudCaseId: fraudCase.fraudCaseId,
        claimId: fraudCase.claimId,
      },
      payload: {
        fraudCaseId: fraudCase.fraudCaseId,
        claimId: fraudCase.claimId,
        claimNumber: fraudCase.claimNumber,
        score: fraudCase.score,
        status: fraudCase.status,
        holdClaim: fraudCase.holdClaim,
        assignedTo: params.assignedTo,
      },
    });

    return fraudCase;
  }

  async closeCase(params: {
    correlationId: string;
    fraudCaseId: string;
    resolution: 'confirmed' | 'cleared';
    notes?: string;
  }): Promise<FraudCase | null> {
    const fraudCase = await this.fraudRepo.findOne({ where: { fraudCaseId: params.fraudCaseId } });
    if (!fraudCase) return null;

    fraudCase.status = params.resolution === 'confirmed' ? 'confirmed' : 'cleared';
    fraudCase.holdClaim = false;
    if (params.notes) fraudCase.notes = params.notes;

    await this.fraudRepo.save(fraudCase);

    await this.outboxPublisher.publish({
      topic: 'insurance.fraud.case_closed',
      eventType: 'FraudCaseClosed',
      eventVersion: 1,
      correlationId: params.correlationId,
      subject: {
        fraudCaseId: fraudCase.fraudCaseId,
        claimId: fraudCase.claimId,
      },
      payload: {
        fraudCaseId: fraudCase.fraudCaseId,
        claimId: fraudCase.claimId,
        claimNumber: fraudCase.claimNumber,
        score: fraudCase.score,
        status: fraudCase.status,
        holdClaim: fraudCase.holdClaim,
        resolution: params.resolution,
        notes: params.notes,
      },
    });

    return fraudCase;
  }

  async listCases(params: { status?: string; claimId?: string; limit: number; offset: number }): Promise<{ rows: FraudCase[]; total: number }> {
    const qb = this.fraudRepo.createQueryBuilder('fc');

    if (params.status) {
      qb.andWhere('fc.status = :status', { status: params.status });
    }
    if (params.claimId) {
      qb.andWhere('fc.claim_id = :claimId', { claimId: params.claimId });
    }

    qb.orderBy('fc.created_at', 'DESC')
      .limit(params.limit)
      .offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }
}
