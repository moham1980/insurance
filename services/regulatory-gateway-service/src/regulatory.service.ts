import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { KafkaProducer, createLogger, Logger } from '@insurance/shared';
import { SanhabEvent } from './entities/SanhabEvent';

export interface SanhabWebhookBody {
  externalEventId?: string;
  eventType: string;
  payload: any;
}

export interface SanhabSimulateBody {
  eventType: string;
  payload?: any;
}

@Injectable()
export class RegulatoryService implements OnModuleInit, OnModuleDestroy {
  private logger: Logger;
  private kafkaProducer?: KafkaProducer;

  constructor(@InjectRepository(SanhabEvent) private readonly sanhabRepo: Repository<SanhabEvent>) {
    this.logger = createLogger({
      serviceName: 'regulatory-gateway-service',
      prettyPrint: process.env.NODE_ENV !== 'production',
    });
  }

  async onModuleInit(): Promise<void> {
    const brokersEnv = process.env.KAFKA_BROKERS;
    if (!brokersEnv) return;

    this.kafkaProducer = new KafkaProducer(
      {
        brokers: brokersEnv.split(','),
        clientId: process.env.KAFKA_CLIENT_ID || 'regulatory-gateway-service',
      },
      this.logger
    );
    await this.kafkaProducer.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.kafkaProducer?.disconnect();
  }

  private async publishSanhabEvent(event: SanhabEvent): Promise<void> {
    if (!this.kafkaProducer) return;

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
            producer: 'regulatory-gateway-service',
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

  async handleWebhook(params: {
    correlationId: string;
    body: SanhabWebhookBody;
    headers: Record<string, string>;
  }): Promise<{ status: number; result: any }> {
    const { correlationId, body, headers } = params;

    if (!body?.eventType) {
      return {
        status: 400,
        result: { success: false, error: { code: 'VALIDATION_ERROR', message: 'eventType is required' }, correlationId },
      };
    }

    const externalEventId = body.externalEventId || uuidv4();

    const existing = await this.sanhabRepo.findOne({ where: { externalEventId } });
    if (existing) {
      return {
        status: 200,
        result: {
          success: true,
          data: { accepted: true, dedup: true, sanhabEventId: existing.sanhabEventId },
          correlationId,
        },
      };
    }

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

    return {
      status: 202,
      result: { success: true, data: { accepted: true, sanhabEventId: saved.sanhabEventId, externalEventId }, correlationId },
    };
  }

  async simulate(params: { correlationId: string; body: SanhabSimulateBody }): Promise<{ status: number; result: any }> {
    const { correlationId, body } = params;

    if (!body?.eventType) {
      return {
        status: 400,
        result: { success: false, error: { code: 'VALIDATION_ERROR', message: 'eventType is required' }, correlationId },
      };
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

    return {
      status: 201,
      result: { success: true, data: { simulated: true, sanhabEventId: saved.sanhabEventId, externalEventId }, correlationId },
    };
  }

  async listEvents(params: { correlationId: string; limit: number; offset: number; eventType?: string }) {
    const take = Math.min(params.limit || 50, 200);
    const skip = params.offset || 0;

    const qb = this.sanhabRepo.createQueryBuilder('e');
    if (params.eventType) {
      qb.andWhere('e.event_type = :eventType', { eventType: params.eventType });
    }

    qb.orderBy('e.received_at', 'DESC').take(take).skip(skip);

    const [items, total] = await qb.getManyAndCount();

    return {
      success: true,
      data: items,
      pagination: { total, limit: take, offset: skip },
      correlationId: params.correlationId,
    };
  }
}
