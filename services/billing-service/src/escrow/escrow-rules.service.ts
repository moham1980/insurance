import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, LessThan, Not } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { EscrowHolding } from './escrow-holding.entity';
import { EscrowRelease, EscrowReleaseType } from './escrow-release.entity';
import { EscrowService } from './escrow.service';
import { OutboxPublisher } from '@insurance/shared';

export type EscrowReleaseReason = 'COOLING_OFF_EXPIRED' | 'CARRIER_APPROVED' | 'CLAIM_SETTLED' | 'REFUND_PROCESSED' | 'POLICY_CANCELLED';

export interface EscrowReleaseRule {
  reason: EscrowReleaseReason;
  holdingId: string;
  destinationAccountRef: string;
  correlationId?: string;
}

export interface EscrowReleaseEvaluation {
  holdingId: string;
  canRelease: boolean;
  reason: EscrowReleaseReason | null;
  destinationAccountRef: string | null;
  message: string;
}

@Injectable()
export class EscrowRulesService {
  private readonly logger = new Logger(EscrowRulesService.name);

  private static readonly COOLING_OFF_DAYS = 3;

  constructor(
    @InjectRepository(EscrowHolding) private readonly holdingRepo: Repository<EscrowHolding>,
    @InjectRepository(EscrowRelease) private readonly releaseRepo: Repository<EscrowRelease>,
    private readonly escrowService: EscrowService,
    private readonly dataSource: DataSource,
  ) {}

  async evaluateReleaseEligibility(holding: EscrowHolding): Promise<EscrowReleaseEvaluation> {
    if (holding.status !== 'held') {
      return {
        holdingId: holding.holdingId,
        canRelease: false,
        reason: null,
        destinationAccountRef: null,
        message: `Holding is in status ${holding.status}, not 'held'`,
      };
    }

    const now = new Date();
    const createdAt = new Date(holding.createdAt);
    const coolingOffEnd = new Date(createdAt);
    coolingOffEnd.setDate(coolingOffEnd.getDate() + EscrowRulesService.COOLING_OFF_DAYS);

    const metadata = holding.metadata || {};
    const carrierApproved = metadata.carrierApproved === true;
    const policyCancelled = metadata.policyCancelled === true;
    const refundProcessed = metadata.refundProcessed === true;
    const claimSettled = metadata.claimSettled === true;

    if (policyCancelled) {
      return {
        holdingId: holding.holdingId,
        canRelease: true,
        reason: 'POLICY_CANCELLED',
        destinationAccountRef: metadata.customerAccountRef || null,
        message: 'Policy cancelled — release escrow back to customer',
      };
    }

    if (refundProcessed) {
      return {
        holdingId: holding.holdingId,
        canRelease: true,
        reason: 'REFUND_PROCESSED',
        destinationAccountRef: metadata.customerAccountRef || null,
        message: 'Refund processed — release escrow back to customer',
      };
    }

    if (claimSettled) {
      return {
        holdingId: holding.holdingId,
        canRelease: true,
        reason: 'CLAIM_SETTLED',
        destinationAccountRef: metadata.carrierAccountRef || null,
        message: 'Claim settled — release escrow to carrier',
      };
    }

    if (carrierApproved && now >= coolingOffEnd) {
      return {
        holdingId: holding.holdingId,
        canRelease: true,
        reason: 'CARRIER_APPROVED',
        destinationAccountRef: metadata.carrierAccountRef || null,
        message: 'Carrier approved and cooling-off period expired',
      };
    }

    if (now >= coolingOffEnd) {
      return {
        holdingId: holding.holdingId,
        canRelease: true,
        reason: 'COOLING_OFF_EXPIRED',
        destinationAccountRef: metadata.carrierAccountRef || holding.escrowAccountRef,
        message: 'Cooling-off period expired — eligible for release to carrier',
      };
    }

    return {
      holdingId: holding.holdingId,
      canRelease: false,
      reason: null,
      destinationAccountRef: null,
      message: `Cooling-off period active until ${coolingOffEnd.toISOString()}`,
    };
  }

  async autoReleaseEligibleHoldings(tenantId: string, correlationId?: string): Promise<EscrowRelease[]> {
    const now = new Date();
    const holdings = await this.holdingRepo.find({
      where: {
        tenantId,
        status: 'held',
        createdAt: LessThan(new Date(now.getTime() - EscrowRulesService.COOLING_OFF_DAYS * 24 * 60 * 60 * 1000)),
      },
    });

    const releases: EscrowRelease[] = [];

    for (const holding of holdings) {
      const evaluation = await this.evaluateReleaseEligibility(holding);
      if (!evaluation.canRelease || !evaluation.destinationAccountRef) continue;

      try {
        const release = await this.escrowService.releaseEscrow({
          tenantId,
          holdingId: holding.holdingId,
          releaseType: 'CARRIER_SETTLEMENT',
          amountMinor: holding.amountMinor,
          destinationAccountRef: evaluation.destinationAccountRef,
          correlationId: correlationId || uuidv4(),
        });
        releases.push(release);

        await this.dataSource.transaction(async (manager) => {
          const outbox = new OutboxPublisher(manager);
          await outbox.publish({
            topic: 'insurance.billing.escrow.auto_released',
            eventType: 'EscrowAutoReleased',
            eventVersion: 1,
            correlationId: correlationId || uuidv4(),
            tenantId,
            subject: { holdingId: holding.holdingId, releaseId: release.releaseId },
            payload: {
              holdingId: holding.holdingId,
              releaseId: release.releaseId,
              reason: evaluation.reason,
              amountMinor: holding.amountMinor,
              currency: holding.currency,
              destinationAccountRef: evaluation.destinationAccountRef,
            },
          });
        });
      } catch (err: any) {
        this.logger.warn(
          `Auto-release failed for holding ${holding.holdingId}: ${err?.message}`,
        );
      }
    }

    return releases;
  }

  async markCarrierApproved(tenantId: string, holdingId: string, approvedBy: string, correlationId?: string): Promise<EscrowHolding> {
    const holding = await this.holdingRepo.findOne({ where: { holdingId, tenantId } });
    if (!holding) throw new BadRequestException('Escrow holding not found');
    if (holding.status !== 'held') throw new BadRequestException(`Holding is in status ${holding.status}`);

    holding.metadata = {
      ...holding.metadata,
      carrierApproved: true,
      carrierApprovedBy: approvedBy,
      carrierApprovedAt: new Date().toISOString(),
    };
    await this.holdingRepo.save(holding);

    await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.billing.escrow.carrier_approved',
        eventType: 'EscrowCarrierApproved',
        eventVersion: 1,
        correlationId: correlationId || uuidv4(),
        tenantId,
        subject: { holdingId: holding.holdingId },
        payload: {
          holdingId: holding.holdingId,
          approvedBy,
        },
      });
    });

    return holding;
  }

  async markPolicyCancelled(tenantId: string, holdingId: string, cancellationId: string, customerAccountRef: string, correlationId?: string): Promise<EscrowHolding> {
    const holding = await this.holdingRepo.findOne({ where: { holdingId, tenantId } });
    if (!holding) throw new BadRequestException('Escrow holding not found');
    if (holding.status !== 'held') throw new BadRequestException(`Holding is in status ${holding.status}`);

    holding.metadata = {
      ...holding.metadata,
      policyCancelled: true,
      cancellationId,
      customerAccountRef,
    };
    await this.holdingRepo.save(holding);

    return holding;
  }

  async markRefundProcessed(tenantId: string, holdingId: string, refundId: string, customerAccountRef: string, correlationId?: string): Promise<EscrowHolding> {
    const holding = await this.holdingRepo.findOne({ where: { holdingId, tenantId } });
    if (!holding) throw new BadRequestException('Escrow holding not found');
    if (holding.status !== 'held') throw new BadRequestException(`Holding is in status ${holding.status}`);

    holding.metadata = {
      ...holding.metadata,
      refundProcessed: true,
      refundId,
      customerAccountRef,
    };
    await this.holdingRepo.save(holding);

    return holding;
  }

  async markClaimSettled(tenantId: string, holdingId: string, claimId: string, carrierAccountRef: string, correlationId?: string): Promise<EscrowHolding> {
    const holding = await this.holdingRepo.findOne({ where: { holdingId, tenantId } });
    if (!holding) throw new BadRequestException('Escrow holding not found');
    if (holding.status !== 'held') throw new BadRequestException(`Holding is in status ${holding.status}`);

    holding.metadata = {
      ...holding.metadata,
      claimSettled: true,
      claimId,
      carrierAccountRef,
    };
    await this.holdingRepo.save(holding);

    return holding;
  }
}
