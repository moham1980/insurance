import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { BaseService, OutboxPublisher } from '@insurance/shared';
import { Claim } from './entities/Claim';
import { v4 as uuidv4 } from 'uuid';

interface CreateClaimRequest {
  policyId: string;
  claimantPartyId: string;
  lossDate: string;
  lossType: string;
  description?: string;
}

interface AssessClaimRequest {
  assessedAmount: number;
}

interface ApproveClaimRequest {
  approvedAmount: number;
}

interface RejectClaimRequest {
  reason: string;
}

interface PayClaimRequest {
  paidAmount: number;
}

export class ClaimsService extends BaseService {
  private claimRepo: Repository<Claim>;

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

  getEntities(): any[] {
    return [Claim];
  }

  async initialize(): Promise<void> {
    await super.initialize();
    this.claimRepo = this.dataSource.getRepository(Claim);
  }

  setupRoutes(): void {
    // POST /claims - Create a new claim
    this.app.post('/claims', async (req: Request, res: Response) => {
      try {
        const correlationId = (req as any).correlationId;
        const body = req.body as CreateClaimRequest;

        // Validate required fields
        if (!body.policyId || !body.claimantPartyId || !body.lossDate || !body.lossType) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Missing required fields: policyId, claimantPartyId, lossDate, lossType',
            },
            correlationId,
          });
        }

        // Create claim entity
        const claimNumber = `CLM-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        const claim = this.claimRepo.create({
          claimId: uuidv4(),
          claimNumber,
          policyId: body.policyId,
          claimantPartyId: body.claimantPartyId,
          lossDate: new Date(body.lossDate),
          lossType: body.lossType,
          description: body.description || null,
          status: 'registered',
          requiresHumanTriage: true,
        });

        // Save to database
        await this.claimRepo.save(claim);

        // Publish event to outbox
        await this.outboxPublisher.publish({
          topic: 'insurance.claim.registered',
          eventType: 'ClaimRegistered',
          eventVersion: 1,
          correlationId,
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
            createdAt: claim.createdAt.toISOString(),
          },
        });

        this.logger.info('Claim created successfully', {
          claimId: claim.claimId,
          claimNumber: claim.claimNumber,
          correlationId,
        });

        return res.status(201).json({
          success: true,
          data: {
            claimId: claim.claimId,
            claimNumber: claim.claimNumber,
            status: claim.status,
            createdAt: claim.createdAt,
          },
          correlationId,
        });
      } catch (error) {
        this.logger.error('Failed to create claim', error as Error, {
          correlationId: (req as any).correlationId,
        });
        return res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create claim',
          },
          correlationId: (req as any).correlationId,
        });
      }
    });

    // POST /claims/:claimId/assess
    this.app.post('/claims/:claimId/assess', async (req: Request, res: Response) => {
      const correlationId = (req as any).correlationId;
      const { claimId } = req.params;
      const body = req.body as AssessClaimRequest;

      if (typeof body.assessedAmount !== 'number') {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'assessedAmount is required (number)' },
          correlationId,
        });
      }

      const claim = await this.claimRepo.findOne({ where: { claimId } });
      if (!claim) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Claim with ID ${claimId} not found` },
          correlationId,
        });
      }

      claim.assessedAmount = body.assessedAmount;
      claim.status = 'assessed';
      await this.claimRepo.save(claim);

      await this.publishClaimEvent({
        correlationId,
        topic: 'insurance.claim.assessed',
        eventType: 'ClaimAssessed',
        claim,
        payload: { assessedAmount: body.assessedAmount },
      });

      return res.json({ success: true, data: { claimId, status: claim.status }, correlationId });
    });

    // POST /claims/:claimId/approve
    this.app.post('/claims/:claimId/approve', async (req: Request, res: Response) => {
      const correlationId = (req as any).correlationId;
      const { claimId } = req.params;
      const body = req.body as ApproveClaimRequest;

      if (typeof body.approvedAmount !== 'number') {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'approvedAmount is required (number)' },
          correlationId,
        });
      }

      const claim = await this.claimRepo.findOne({ where: { claimId } });
      if (!claim) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Claim with ID ${claimId} not found` },
          correlationId,
        });
      }

      claim.approvedAmount = body.approvedAmount;
      claim.status = 'approved';
      await this.claimRepo.save(claim);

      await this.publishClaimEvent({
        correlationId,
        topic: 'insurance.claim.approved',
        eventType: 'ClaimApproved',
        claim,
        payload: { approvedAmount: body.approvedAmount },
      });

      return res.json({ success: true, data: { claimId, status: claim.status }, correlationId });
    });

    // POST /claims/:claimId/reject
    this.app.post('/claims/:claimId/reject', async (req: Request, res: Response) => {
      const correlationId = (req as any).correlationId;
      const { claimId } = req.params;
      const body = req.body as RejectClaimRequest;

      if (!body.reason) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'reason is required (string)' },
          correlationId,
        });
      }

      const claim = await this.claimRepo.findOne({ where: { claimId } });
      if (!claim) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Claim with ID ${claimId} not found` },
          correlationId,
        });
      }

      claim.status = 'rejected';
      await this.claimRepo.save(claim);

      await this.publishClaimEvent({
        correlationId,
        topic: 'insurance.claim.rejected',
        eventType: 'ClaimRejected',
        claim,
        payload: { reason: body.reason },
      });

      return res.json({ success: true, data: { claimId, status: claim.status }, correlationId });
    });

    // POST /claims/:claimId/pay
    this.app.post('/claims/:claimId/pay', async (req: Request, res: Response) => {
      const correlationId = (req as any).correlationId;
      const { claimId } = req.params;
      const body = req.body as PayClaimRequest;

      if (typeof body.paidAmount !== 'number') {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'paidAmount is required (number)' },
          correlationId,
        });
      }

      const claim = await this.claimRepo.findOne({ where: { claimId } });
      if (!claim) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Claim with ID ${claimId} not found` },
          correlationId,
        });
      }

      claim.paidAmount = body.paidAmount;
      claim.status = 'paid';
      await this.claimRepo.save(claim);

      await this.publishClaimEvent({
        correlationId,
        topic: 'insurance.claim.paid',
        eventType: 'ClaimPaid',
        claim,
        payload: { paidAmount: body.paidAmount },
      });

      return res.json({ success: true, data: { claimId, status: claim.status }, correlationId });
    });

    // POST /claims/:claimId/close
    this.app.post('/claims/:claimId/close', async (req: Request, res: Response) => {
      const correlationId = (req as any).correlationId;
      const { claimId } = req.params;

      const claim = await this.claimRepo.findOne({ where: { claimId } });
      if (!claim) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Claim with ID ${claimId} not found` },
          correlationId,
        });
      }

      claim.status = 'closed';
      await this.claimRepo.save(claim);

      await this.publishClaimEvent({
        correlationId,
        topic: 'insurance.claim.closed',
        eventType: 'ClaimClosed',
        claim,
        payload: {},
      });

      return res.json({ success: true, data: { claimId, status: claim.status }, correlationId });
    });

    // GET /claims/:claimId - Get claim by ID
    this.app.get('/claims/:claimId', async (req: Request, res: Response) => {
      try {
        const correlationId = (req as any).correlationId;
        const { claimId } = req.params;

        const claim = await this.claimRepo.findOne({ where: { claimId } });

        if (!claim) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: `Claim with ID ${claimId} not found`,
            },
            correlationId,
          });
        }

        return res.json({
          success: true,
          data: claim,
          correlationId,
        });
      } catch (error) {
        this.logger.error('Failed to get claim', error as Error, {
          correlationId: (req as any).correlationId,
        });
        return res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve claim',
          },
          correlationId: (req as any).correlationId,
        });
      }
    });

    // GET /claims - List claims (with basic filtering)
    this.app.get('/claims', async (req: Request, res: Response) => {
      try {
        const correlationId = (req as any).correlationId;
        const { policyId, status, limit = '20', offset = '0' } = req.query;

        const queryBuilder = this.claimRepo.createQueryBuilder('claim');

        if (policyId) {
          queryBuilder.andWhere('claim.policy_id = :policyId', { policyId });
        }

        if (status) {
          queryBuilder.andWhere('claim.status = :status', { status });
        }

        queryBuilder
          .orderBy('claim.created_at', 'DESC')
          .limit(parseInt(limit as string, 10))
          .offset(parseInt(offset as string, 10));

        const [claims, total] = await queryBuilder.getManyAndCount();

        return res.json({
          success: true,
          data: claims,
          pagination: {
            total,
            limit: parseInt(limit as string, 10),
            offset: parseInt(offset as string, 10),
          },
          correlationId,
        });
      } catch (error) {
        this.logger.error('Failed to list claims', error as Error, {
          correlationId: (req as any).correlationId,
        });
        return res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve claims',
          },
          correlationId: (req as any).correlationId,
        });
      }
    });
  }
}
