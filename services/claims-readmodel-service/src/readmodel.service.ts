import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { Repository } from 'typeorm';
import { ConsumedEvent, createLogger, EventEnvelope } from '@insurance/shared';
import { RmClaimCase } from './entities/RmClaimCase';

@Injectable()
export class ReadModelService implements OnModuleInit, OnModuleDestroy {
  private consumer?: Consumer;

  constructor(
    @InjectRepository(RmClaimCase) private readonly rmRepo: Repository<RmClaimCase>,
    @InjectRepository(ConsumedEvent) private readonly consumedRepo: Repository<ConsumedEvent>
  ) {}

  private logger = createLogger({
    serviceName: 'claims-readmodel-service',
    prettyPrint: process.env.NODE_ENV !== 'production',
  });

  async onModuleInit(): Promise<void> {
    await this.startConsumer();
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer?.disconnect();
  }

  private getKafkaConfig() {
    const kafkaBrokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
    const consumerGroupId = process.env.KAFKA_CONSUMER_GROUP || 'claims-readmodel-v1';

    return { kafkaBrokers, consumerGroupId };
  }

  private async ensureIdempotent(eventId: string, consumerName: string, topic: string): Promise<boolean> {
    const existing = await this.consumedRepo.findOne({ where: { eventId, consumerName } });
    if (existing) return false;

    const consumed = this.consumedRepo.create({
      eventId,
      consumerName,
      topic,
    });

    await this.consumedRepo.save(consumed);
    return true;
  }

  private async upsertRmClaimCase(envelope: EventEnvelope<any>): Promise<void> {
    const claimId = envelope.subject?.claimId || envelope.payload?.claimId;
    if (!claimId) {
      this.logger.warn('Skipping event without claimId', { eventId: envelope.eventId });
      return;
    }

    const claimNumber = envelope.subject?.claimNumber || envelope.payload?.claimNumber;
    const policyId = envelope.subject?.policyId || envelope.payload?.policyId;

    await this.rmRepo.upsert(
      {
        claimId,
        claimNumber,
        policyId,
        status: envelope.payload?.status || 'registered',
        lossDate: envelope.payload?.lossDate ? new Date(envelope.payload.lossDate) : null,
        lossType: envelope.payload?.lossType || null,
        requiresHumanTriage: envelope.payload?.requiresHumanTriage ?? null,
        createdAt: envelope.payload?.createdAt ? new Date(envelope.payload.createdAt) : null,
        lastEventId: envelope.eventId,
        updatedAt: new Date(),
      },
      ['claimId']
    );
  }

  private async applyEvent(envelope: EventEnvelope<any>): Promise<void> {
    switch (envelope.eventType) {
      case 'ClaimRegistered':
      case 'ClaimAssessed':
      case 'ClaimApproved':
      case 'ClaimRejected':
      case 'ClaimPaid':
      case 'ClaimClosed':
        await this.upsertRmClaimCase(envelope);
        return;
      default:
        this.logger.warn('Unknown eventType - ignored', { eventType: envelope.eventType, eventId: envelope.eventId });
    }
  }

  private async startConsumer(): Promise<void> {
    const { kafkaBrokers, consumerGroupId } = this.getKafkaConfig();

    const kafka = new Kafka({
      clientId: 'claims-readmodel-service',
      brokers: kafkaBrokers,
    });

    this.consumer = kafka.consumer({ groupId: consumerGroupId });

    await this.consumer.connect();

    const topics = [
      'insurance.claim.registered',
      'insurance.claim.assessed',
      'insurance.claim.approved',
      'insurance.claim.rejected',
      'insurance.claim.paid',
      'insurance.claim.closed',
    ];

    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning: true });
    }

    this.logger.info('Kafka consumer started', { groupId: consumerGroupId });

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        const { topic, message } = payload;
        const rawValue = message.value?.toString('utf-8');
        if (!rawValue) return;

        const envelope = JSON.parse(rawValue) as EventEnvelope<any>;

        const shouldProcess = await this.ensureIdempotent(envelope.eventId, consumerGroupId, topic);
        if (!shouldProcess) return;

        await this.applyEvent(envelope);
      },
    });
  }

  async listClaims(params: { policyId?: string; status?: string; limit: number; offset: number }) {
    const qb = this.rmRepo.createQueryBuilder('rm');

    if (params.policyId) qb.andWhere('rm.policy_id = :policyId', { policyId: params.policyId });
    if (params.status) qb.andWhere('rm.status = :status', { status: params.status });

    qb.orderBy('rm.updated_at', 'DESC').limit(params.limit).offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async getClaim(claimId: string): Promise<RmClaimCase | null> {
    return this.rmRepo.findOne({ where: { claimId } });
  }

  async getSummary(): Promise<{ total: number; byStatus: Array<{ status: string; count: number }> }> {
    const rows = await this.rmRepo
      .createQueryBuilder('rm')
      .select('rm.status', 'status')
      .addSelect('COUNT(1)', 'count')
      .groupBy('rm.status')
      .getRawMany();

    const total = rows.reduce((acc: number, r: any) => acc + parseInt(r.count, 10), 0);

    return {
      total,
      byStatus: rows.map((r: any) => ({ status: r.status, count: parseInt(r.count, 10) })),
    };
  }
}
