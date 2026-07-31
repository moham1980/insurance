import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { ConsumedEvent, DeadLetterEvent } from '@insurance/shared';
import { ProjectionSyncService } from './projection-sync.service';
import { Policy } from './entities/Policy';

@Injectable()
export class ProjectionEventHandler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProjectionEventHandler.name);
  private readonly consumerName = 'policy-service-projection';
  private kafka: Kafka | null = null;
  private consumer: Consumer | null = null;

  private static readonly TOPICS = [
    'insurance.policy.issued',
    'insurance.policy.endorsement.applied',
    'insurance.policy.endorsed',
    'insurance.policy.renewed',
    'insurance.policy.cancelled',
    'insurance.policy.lapsed',
  ];

  constructor(
    private readonly projectionSyncService: ProjectionSyncService,
    @InjectRepository(ConsumedEvent)
    private readonly consumedEventRepo: Repository<ConsumedEvent>,
    @InjectRepository(DeadLetterEvent)
    private readonly deadLetterRepo: Repository<DeadLetterEvent>,
    @InjectRepository(Policy)
    private readonly policyRepo: Repository<Policy>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    const brokers = process.env.KAFKA_BROKERS?.split(',').map(b => b.trim()).filter(Boolean) || [];
    if (brokers.length === 0) {
      this.logger.warn('KAFKA_BROKERS not set, ProjectionEventHandler will not start');
      return;
    }

    this.kafka = new Kafka({
      clientId: 'policy-service-projection-consumer',
      brokers,
    });

    this.consumer = this.kafka.consumer({ groupId: 'policy-service-projection-group' });
    await this.consumer.connect();

    for (const topic of ProjectionEventHandler.TOPICS) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
    }

    this.logger.log(`ProjectionEventHandler subscribed to ${ProjectionEventHandler.TOPICS.join(', ')}`);

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.handleMessage(payload);
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.consumer) {
        await this.consumer.disconnect();
        this.logger.log('ProjectionEventHandler disconnected');
      }
    } catch (err) {
      this.logger.error('Error disconnecting ProjectionEventHandler', err);
    }
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    const key = message.key?.toString() || '';
    const value = message.value?.toString() || '';

    let event: any;
    try {
      event = JSON.parse(value);
    } catch {
      this.logger.error(`Failed to parse message on ${topic}:${partition}:${message.offset}`);
      await this.deadLetterRepo.save({
        topic,
        partition,
        offset: message.offset,
        key,
        value,
        error: 'JSON_PARSE_ERROR',
        consumerName: this.consumerName,
        createdAt: new Date(),
      });
      return;
    }

    const eventId = event.eventId || event.id || `${topic}-${key}-${partition}-${message.offset}`;
    const correlationId = event.correlationId || key;

    const existing = await this.consumedEventRepo.findOne({
      where: { eventId, consumerName: this.consumerName },
    });
    if (existing) {
      this.logger.debug(`Duplicate message skipped: eventId=${eventId}`);
      return;
    }

    const policyId = event.subject?.policyId || event.payload?.policyId;
    if (!policyId) {
      this.logger.warn(`Projection event on ${topic} missing policyId, eventId=${eventId}`);
      await this.deadLetterRepo.save({
        topic,
        partition,
        offset: message.offset,
        key,
        value,
        error: 'MISSING_POLICY_ID',
        consumerName: this.consumerName,
        createdAt: new Date(),
      });
      return;
    }

    try {
      this.logger.log(`Processing projection event ${event.eventType} for policyId=${policyId}, eventId=${eventId}`);

      await this.syncProjectionFromEvent(topic, event, policyId, correlationId);

      await this.consumedEventRepo.save({
        eventId,
        consumerName: this.consumerName,
        topic,
        processedAt: new Date(),
      });

      this.logger.log(`Projection synced for policy ${policyId} from event ${event.eventType}`);
    } catch (err: any) {
      this.logger.error(
        `Failed to process projection event: ${err?.message || err}`,
        err?.stack,
      );

      await this.deadLetterRepo.save({
        topic,
        partition,
        offset: message.offset,
        key,
        value,
        error: err?.message || 'PROCESSING_ERROR',
        consumerName: this.consumerName,
        createdAt: new Date(),
      });

      throw err;
    }
  }

  private async syncProjectionFromEvent(
    topic: string,
    event: any,
    policyId: string,
    correlationId: string,
  ): Promise<void> {
    const policy = await this.policyRepo.findOne({ where: { policyId } });
    if (!policy) {
      this.logger.warn(`Policy ${policyId} not found for projection sync from ${topic}`);
      return;
    }

    const tenantId = event.tenantId || policy.tenantId || 'default';
    const brokerOrganizationId = policy.distributionOrganizationId || '00000000-0000-0000-0000-000000000000';
    const issuerOrganizationId = policy.issuerOrganizationId || '00000000-0000-0000-0000-000000000000';
    const sourceSystemId = policy.sourceSystemId || 'insurance-core';

    const payload: any = {
      policyId: policy.policyId,
      policyNumber: policy.policyNumber,
      uniqueCode: policy.uniqueCode,
      status: policy.status,
      startDate: policy.startDate?.toISOString(),
      endDate: policy.endDate?.toISOString(),
      premiumAmount: Number(policy.premiumAmount),
      coverages: policy.coverages,
      installments: policy.installments,
      metadata: {
        eventType: event.eventType,
        sourceVersion: event.eventVersion || 1,
        topic,
      },
    };

    if (event.payload?.before && event.payload?.after) {
      payload.metadata.before = event.payload.before;
      payload.metadata.after = event.payload.after;
    }

    await this.projectionSyncService.syncProjection({
      tenantId,
      brokerOrganizationId,
      issuerOrganizationId,
      sourceSystemId,
      payload,
      correlationId,
    });
  }
}
