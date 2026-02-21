import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { BaseService } from '@insurance/shared';
import { v4 as uuidv4 } from 'uuid';
import { SanhabEvent } from './entities/SanhabEvent';

interface SanhabWebhookBody {
  externalEventId?: string;
  eventType: string;
  payload: any;
}

interface SanhabSimulateBody {
  eventType: string;
  payload?: any;
}

export class RegulatoryGatewayService extends BaseService {
  private sanhabRepo!: Repository<SanhabEvent>;

  getEntities(): any[] {
    return [SanhabEvent];
  }

  async initialize(): Promise<void> {
    await super.initialize();
    this.sanhabRepo = this.dataSource.getRepository(SanhabEvent);
  }

  private async publishSanhabEvent(event: SanhabEvent): Promise<void> {
    if (!this.kafkaProducer) {
      return;
    }

    await this.kafkaProducer.send({
      topic: 'insurance.regulatory.sanhab.event_received',
      messages: [
        {
          key: event.externalEventId,
          value: JSON.stringify({
            eventId: event.sanhabEventId,
            eventType: 'SanhabEventReceived',
            eventVersion: 1,
            occurredAt: event.receivedAt.toISOString(),
            producer: this.config.name,
            correlationId: event.correlationId,
            subject: { externalEventId: event.externalEventId },
            payload: {
              externalEventId: event.externalEventId,
              source: event.source,
              eventType: event.eventType,
              payload: event.payload,
            },
          }),
        },
      ],
    });
  }

  setupRoutes(): void {
    this.app.post('/reg/sanhab/webhook', async (req: Request, res: Response) => {
      const correlationId = (req as any).correlationId as string;

      try {
        const body = req.body as SanhabWebhookBody;

        if (!body?.eventType) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'eventType is required' },
            correlationId,
          });
        }

        const externalEventId = body.externalEventId || uuidv4();

        const existing = await this.sanhabRepo.findOne({ where: { externalEventId } });
        if (existing) {
          return res.status(200).json({
            success: true,
            data: { accepted: true, dedup: true, sanhabEventId: existing.sanhabEventId },
            correlationId,
          });
        }

        const headers = Object.fromEntries(
          Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : String(v)])
        );

        const event = this.sanhabRepo.create({
          externalEventId,
          eventType: body.eventType,
          source: 'sanhab',
          correlationId,
          payload: body.payload ?? {},
          headers,
        });

        const saved = await this.sanhabRepo.save(event);
        await this.publishSanhabEvent(saved);

        return res.status(202).json({
          success: true,
          data: { accepted: true, sanhabEventId: saved.sanhabEventId, externalEventId },
          correlationId,
        });
      } catch (error) {
        this.logger.error('Failed to handle sanhab webhook', error as Error, { correlationId });
        return res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to handle webhook' },
          correlationId,
        });
      }
    });

    this.app.post('/reg/sanhab/simulate', async (req: Request, res: Response) => {
      const correlationId = (req as any).correlationId as string;

      try {
        const body = req.body as SanhabSimulateBody;
        if (!body?.eventType) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'eventType is required' },
            correlationId,
          });
        }

        const externalEventId = uuidv4();
        const event = this.sanhabRepo.create({
          externalEventId,
          eventType: body.eventType,
          source: 'simulation',
          correlationId,
          payload: body.payload ?? {},
          headers: null,
        });

        const saved = await this.sanhabRepo.save(event);
        await this.publishSanhabEvent(saved);

        return res.status(201).json({
          success: true,
          data: { simulated: true, sanhabEventId: saved.sanhabEventId, externalEventId },
          correlationId,
        });
      } catch (error) {
        this.logger.error('Failed to simulate sanhab event', error as Error, { correlationId });
        return res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to simulate event' },
          correlationId,
        });
      }
    });

    this.app.get('/reg/sanhab/events', async (req: Request, res: Response) => {
      const correlationId = (req as any).correlationId as string;
      const { limit = '50', offset = '0', eventType } = req.query;

      const take = Math.min(parseInt(limit as string, 10) || 50, 200);
      const skip = parseInt(offset as string, 10) || 0;

      const qb = this.sanhabRepo.createQueryBuilder('e');
      if (eventType) {
        qb.andWhere('e.event_type = :eventType', { eventType });
      }

      qb.orderBy('e.received_at', 'DESC').take(take).skip(skip);

      const [items, total] = await qb.getManyAndCount();

      return res.json({
        success: true,
        data: items,
        pagination: { total, limit: take, offset: skip },
        correlationId,
      });
    });
  }
}
