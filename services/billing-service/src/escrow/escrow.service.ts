import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { EscrowHolding, EscrowSourceType } from './escrow-holding.entity';
import { EscrowRelease, EscrowReleaseType } from './escrow-release.entity';
import { PremiumInvoice } from '../invoicing/premium-invoice.entity';
import { OutboxPublisher } from '@insurance/shared';

export interface HoldEscrowInput {
  tenantId: string;
  escrowAccountRef: string;
  sourceType: EscrowSourceType;
  sourceId: string;
  amountMinor: string;
  currency: string;
  expectedReleaseAt?: Date;
  correlationId?: string;
}

export interface ReleaseEscrowInput {
  tenantId: string;
  holdingId: string;
  releaseType: EscrowReleaseType;
  amountMinor: string;
  destinationAccountRef: string;
  paymentId?: string;
  correlationId?: string;
}

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(
    @InjectRepository(EscrowHolding) private readonly holdingRepo: Repository<EscrowHolding>,
    @InjectRepository(EscrowRelease) private readonly releaseRepo: Repository<EscrowRelease>,
  ) {}

  async holdEscrow(
    manager: EntityManager,
    input: HoldEscrowInput,
    invoice?: PremiumInvoice,
  ): Promise<EscrowHolding> {
    const holdingRepo = manager.getRepository(EscrowHolding);
    const outbox = new OutboxPublisher(manager);

    const existing = await holdingRepo.findOne({
      where: { tenantId: input.tenantId, sourceType: input.sourceType, sourceId: input.sourceId },
    });
    if (existing) return existing;

    const holding = holdingRepo.create({
      holdingId: uuidv4(),
      tenantId: input.tenantId,
      escrowAccountRef: input.escrowAccountRef,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      status: 'held',
      expectedReleaseAt: input.expectedReleaseAt || null,
      releasedAt: null,
      metadata: invoice
        ? { invoiceId: invoice.invoiceId, policyId: invoice.policyId, customerPartyId: invoice.customerPartyId }
        : null,
    });
    const saved = await holdingRepo.save(holding);

    await outbox.publish({
      topic: 'insurance.billing.escrow.held',
      eventType: 'EscrowHeld',
      eventVersion: 1,
      correlationId: input.correlationId || uuidv4(),
      tenantId: input.tenantId,
      subject: { holdingId: saved.holdingId, sourceId: input.sourceId },
      payload: {
        holdingId: saved.holdingId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        amountMinor: input.amountMinor,
        currency: input.currency,
      },
    });

    return saved;
  }

  async releaseEscrow(input: ReleaseEscrowInput): Promise<EscrowRelease> {
    return await this.holdingRepo.manager.transaction(async (manager) => {
      const holdingRepo = manager.getRepository(EscrowHolding);
      const releaseRepo = manager.getRepository(EscrowRelease);
      const outbox = new OutboxPublisher(manager);

      const holding = await holdingRepo.findOne({
        where: { holdingId: input.holdingId, tenantId: input.tenantId },
      });
      if (!holding) throw new NotFoundException('Escrow holding not found');
      if (holding.status !== 'held') throw new BadRequestException('Escrow holding is not in held status');

      const releaseAmount = BigInt(input.amountMinor);
      const heldAmount = BigInt(holding.amountMinor);
      if (releaseAmount > heldAmount) {
        throw new BadRequestException('Release amount exceeds held amount');
      }

      const release = releaseRepo.create({
        releaseId: uuidv4(),
        tenantId: input.tenantId,
        holdingId: input.holdingId,
        releaseType: input.releaseType,
        amountMinor: input.amountMinor,
        currency: holding.currency,
        destinationAccountRef: input.destinationAccountRef,
        paymentId: input.paymentId || null,
        status: 'pending',
      });
      const savedRelease = await releaseRepo.save(release);

      if (releaseAmount === heldAmount) {
        holding.status = 'released';
        holding.releasedAt = new Date();
      }
      await holdingRepo.save(holding);

      await outbox.publish({
        topic: 'insurance.billing.escrow.released',
        eventType: 'EscrowReleased',
        eventVersion: 1,
        correlationId: input.correlationId || uuidv4(),
        tenantId: input.tenantId,
        subject: { holdingId: holding.holdingId, releaseId: savedRelease.releaseId },
        payload: {
          holdingId: holding.holdingId,
          releaseId: savedRelease.releaseId,
          releaseType: input.releaseType,
          amountMinor: input.amountMinor,
          currency: holding.currency,
          destinationAccountRef: input.destinationAccountRef,
        },
      });

      return savedRelease;
    });
  }

  async getHoldings(tenantId: string, escrowAccountRef?: string): Promise<EscrowHolding[]> {
    const where: any = { tenantId };
    if (escrowAccountRef) where.escrowAccountRef = escrowAccountRef;
    return this.holdingRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async getHolding(tenantId: string, holdingId: string): Promise<EscrowHolding | null> {
    return this.holdingRepo.findOne({ where: { tenantId, holdingId } });
  }

  async getReleasesByHolding(tenantId: string, holdingId: string): Promise<EscrowRelease[]> {
    return this.releaseRepo.find({ where: { tenantId, holdingId }, order: { createdAt: 'DESC' } });
  }

  async reconcileEscrowBalance(tenantId: string, escrowAccountRef: string): Promise<{
    escrowAccountRef: string;
    heldTotalMinor: string;
    releasedTotalMinor: string;
    remainingTotalMinor: string;
  }> {
    const held = await this.holdingRepo
      .createQueryBuilder('h')
      .where('h.tenant_id = :tenantId', { tenantId })
      .andWhere('h.escrow_account_ref = :ref', { ref: escrowAccountRef })
      .andWhere("h.status = 'held'")
      .select('SUM(h.amount_minor)', 'total')
      .getRawOne();

    const released = await this.releaseRepo
      .createQueryBuilder('r')
      .innerJoin('escrow_holdings', 'h', 'r.holding_id = h.holding_id')
      .where('h.tenant_id = :tenantId', { tenantId })
      .andWhere('h.escrow_account_ref = :ref', { ref: escrowAccountRef })
      .andWhere("r.status IN ('sent','settled')")
      .select('SUM(r.amount_minor)', 'total')
      .getRawOne();

    const heldTotal = BigInt(held?.total || '0');
    const releasedTotal = BigInt(released?.total || '0');

    return {
      escrowAccountRef,
      heldTotalMinor: heldTotal.toString(),
      releasedTotalMinor: releasedTotal.toString(),
      remainingTotalMinor: (heldTotal - releasedTotal).toString(),
    };
  }
}
