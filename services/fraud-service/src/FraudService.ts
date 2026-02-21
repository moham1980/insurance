import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { BaseService, OutboxPublisher } from '@insurance/shared';
import { FraudCase } from './entities/FraudCase';
import { v4 as uuidv4 } from 'uuid';

interface ComputeScoreRequest {
  claimId: string;
  claimNumber: string;
  lossType: string;
  policyId: string;
}

interface OpenCaseRequest {
  notes?: string;
  assignedTo?: string;
}

interface CloseCaseRequest {
  resolution: 'confirmed' | 'cleared';
  notes?: string;
}

export class FraudService extends BaseService {
  private fraudRepo: Repository<FraudCase>;

  private async publishFraudEvent(params: {
    correlationId: string;
    topic: string;
    eventType: string;
    fraudCase: FraudCase;
    payload: Record<string, unknown>;
  }): Promise<void> {
    await this.outboxPublisher.publish({
      topic: params.topic,
      eventType: params.eventType,
      eventVersion: 1,
      correlationId: params.correlationId,
      subject: {
        fraudCaseId: params.fraudCase.fraudCaseId,
        claimId: params.fraudCase.claimId,
      },
      payload: {
        fraudCaseId: params.fraudCase.fraudCaseId,
        claimId: params.fraudCase.claimId,
        claimNumber: params.fraudCase.claimNumber,
        score: params.fraudCase.score,
        status: params.fraudCase.status,
        holdClaim: params.fraudCase.holdClaim,
        ...params.payload,
      },
    });
  }

  getEntities(): any[] {
    return [FraudCase];
  }

  async initialize(): Promise<void> {
    await super.initialize();
    this.fraudRepo = this.dataSource.getRepository(FraudCase);
  }

  setupRoutes(): void {
    // POST /fraud/compute-score - Compute fraud score for a claim
    this.app.post('/fraud/compute-score', async (req: Request, res: Response) => {
      try {
        const correlationId = (req as any).correlationId;
        const body = req.body as ComputeScoreRequest;

        if (!body.claimId || !body.claimNumber || !body.lossType) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'claimId, claimNumber, lossType are required' },
            correlationId,
          });
        }

        // Simple mock fraud scoring logic
        const signals: string[] = [];
        let score = 0;

        if (body.lossType === 'AUTO') {
          score += 30;
          signals.push('AUTO_CLAIM');
        }
        if (body.lossType === 'PROPERTY') {
          score += 20;
          signals.push('PROPERTY_CLAIM');
        }
        // Simulate random additional signals
        if (Math.random() > 0.7) {
          score += 25;
          signals.push('HIGH_VALUE_CLAIM');
        }

        const holdClaim = score >= 50;

        // Publish fraud score computed event
        await this.outboxPublisher.publish({
          topic: 'insurance.fraud.score_computed',
          eventType: 'FraudScoreComputed',
          eventVersion: 1,
          correlationId,
          subject: {
            claimId: body.claimId,
            claimNumber: body.claimNumber,
          },
          payload: {
            claimId: body.claimId,
            claimNumber: body.claimNumber,
            policyId: body.policyId,
            score,
            signals,
            holdClaim,
            threshold: 50,
          },
        });

        this.logger.info('Fraud score computed', {
          claimId: body.claimId,
          score,
          holdClaim,
          correlationId,
        });

        return res.json({
          success: true,
          data: {
            claimId: body.claimId,
            score,
            signals,
            holdClaim,
            threshold: 50,
          },
          correlationId,
        });
      } catch (error) {
        this.logger.error('Failed to compute fraud score', error as Error, {
          correlationId: (req as any).correlationId,
        });
        return res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to compute fraud score' },
          correlationId: (req as any).correlationId,
        });
      }
    });

    // POST /fraud/cases/:claimId/open - Open a fraud case
    this.app.post('/fraud/cases/:claimId/open', async (req: Request, res: Response) => {
      try {
        const correlationId = (req as any).correlationId;
        const { claimId } = req.params;
        const body = req.body as OpenCaseRequest;

        const claimNumber = req.body.claimNumber || `CLM-${claimId.slice(0, 8)}`;
        const score = req.body.score || 75;

        const fraudCase = this.fraudRepo.create({
          fraudCaseId: uuidv4(),
          claimId,
          claimNumber,
          score,
          signals: req.body.signals || ['MANUAL_REVIEW'],
          status: 'open',
          assignedTo: body.assignedTo || null,
          holdClaim: true,
          notes: body.notes || null,
        });

        await this.fraudRepo.save(fraudCase);

        await this.publishFraudEvent({
          correlationId,
          topic: 'insurance.fraud.case_opened',
          eventType: 'FraudCaseOpened',
          fraudCase,
          payload: { assignedTo: body.assignedTo },
        });

        this.logger.info('Fraud case opened', {
          fraudCaseId: fraudCase.fraudCaseId,
          claimId,
          correlationId,
        });

        return res.status(201).json({
          success: true,
          data: {
            fraudCaseId: fraudCase.fraudCaseId,
            claimId: fraudCase.claimId,
            status: fraudCase.status,
            holdClaim: fraudCase.holdClaim,
          },
          correlationId,
        });
      } catch (error) {
        this.logger.error('Failed to open fraud case', error as Error, {
          correlationId: (req as any).correlationId,
        });
        return res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to open fraud case' },
          correlationId: (req as any).correlationId,
        });
      }
    });

    // POST /fraud/cases/:fraudCaseId/close - Close a fraud case
    this.app.post('/fraud/cases/:fraudCaseId/close', async (req: Request, res: Response) => {
      try {
        const correlationId = (req as any).correlationId;
        const { fraudCaseId } = req.params;
        const body = req.body as CloseCaseRequest;

        if (!body.resolution || !['confirmed', 'cleared'].includes(body.resolution)) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'resolution must be confirmed or cleared' },
            correlationId,
          });
        }

        const fraudCase = await this.fraudRepo.findOne({ where: { fraudCaseId } });
        if (!fraudCase) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: `Fraud case ${fraudCaseId} not found` },
            correlationId,
          });
        }

        fraudCase.status = body.resolution === 'confirmed' ? 'confirmed' : 'cleared';
        fraudCase.holdClaim = false;
        if (body.notes) fraudCase.notes = body.notes;
        await this.fraudRepo.save(fraudCase);

        await this.publishFraudEvent({
          correlationId,
          topic: 'insurance.fraud.case_closed',
          eventType: 'FraudCaseClosed',
          fraudCase,
          payload: { resolution: body.resolution, notes: body.notes },
        });

        this.logger.info('Fraud case closed', {
          fraudCaseId,
          resolution: body.resolution,
          correlationId,
        });

        return res.json({
          success: true,
          data: {
            fraudCaseId: fraudCase.fraudCaseId,
            status: fraudCase.status,
            holdClaim: fraudCase.holdClaim,
          },
          correlationId,
        });
      } catch (error) {
        this.logger.error('Failed to close fraud case', error as Error, {
          correlationId: (req as any).correlationId,
        });
        return res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to close fraud case' },
          correlationId: (req as any).correlationId,
        });
      }
    });

    // GET /fraud/cases - List fraud cases
    this.app.get('/fraud/cases', async (req: Request, res: Response) => {
      try {
        const correlationId = (req as any).correlationId;
        const { status, claimId, limit = '20', offset = '0' } = req.query;

        const qb = this.fraudRepo.createQueryBuilder('fc');

        if (status) {
          qb.andWhere('fc.status = :status', { status });
        }
        if (claimId) {
          qb.andWhere('fc.claim_id = :claimId', { claimId });
        }

        qb.orderBy('fc.created_at', 'DESC')
          .limit(parseInt(limit as string, 10))
          .offset(parseInt(offset as string, 10));

        const [cases, total] = await qb.getManyAndCount();

        return res.json({
          success: true,
          data: cases,
          pagination: {
            total,
            limit: parseInt(limit as string, 10),
            offset: parseInt(offset as string, 10),
          },
          correlationId,
        });
      } catch (error) {
        this.logger.error('Failed to list fraud cases', error as Error, {
          correlationId: (req as any).correlationId,
        });
        return res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to list fraud cases' },
          correlationId: (req as any).correlationId,
        });
      }
    });
  }
}
