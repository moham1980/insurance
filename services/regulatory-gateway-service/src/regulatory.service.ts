import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import {Repository, DataSource} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { createHmac } from 'crypto';
import { KafkaProducer, createEventEnvelope, createLogger, Logger, OutboxPublisher } from '@insurance/shared';
import { SanhabEvent } from './entities/SanhabEvent';
import { RegulatoryFailureLog } from './entities/RegulatoryFailureLog';
import { ISanhabClient } from './sanhab-clients/sanhab-client.interface';
import { MockSanhabClient } from './sanhab-clients/mock-sanhab.client';
import { RealSanhabClient } from './sanhab-clients/real-sanhab.client';
import { CircuitBreaker, CircuitBreakerConfig } from './circuit-breaker';

export interface SanhabWebhookBody {
  externalEventId?: string;
  eventType: string;
  payload: any;
}

export interface SanhabSimulateBody {
  eventType: string;
  payload?: any;
  tenantId?: string;
}

export type SanhabInquiryResultCode = 'OK' | 'NOT_FOUND' | 'MISMATCH' | 'PENDING_SYNC' | 'UPSTREAM_ERROR';

export type SanhabInquiryMethod = 'nationalId_uniqueCode' | 'policyNumber' | 'vin';

export interface SanhabInquiryBody {
  nationalId?: string;
  uniqueCode?: string;
  policyNumber?: string;
  vin?: string;
}

@Injectable()
export class RegulatoryService implements OnModuleInit, OnModuleDestroy {
  private logger: Logger;
  private kafkaProducer?: KafkaProducer;
  private sanhabClient: ISanhabClient;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(SanhabEvent) private readonly sanhabRepo: Repository<SanhabEvent>,
    @InjectRepository(RegulatoryFailureLog) private readonly failureRepo: Repository<RegulatoryFailureLog>
  ) {
    this.logger = createLogger({
      serviceName: 'regulatory-gateway-service',
      prettyPrint: process.env.NODE_ENV !== 'production',
    });

    // Initialize Sanhab client based on environment
    const useRealSanhab = process.env.SANHAB_USE_REAL === 'true';
    if (useRealSanhab) {
      this.sanhabClient = new RealSanhabClient();
      this.logger.info('Using Real Sanhab Client');
    } else {
      this.sanhabClient = new MockSanhabClient();
      this.logger.info('Using Mock Sanhab Client (development mode)');
    }

    // Initialize Circuit Breaker for Sanhab calls
    const circuitBreakerConfig: CircuitBreakerConfig = {
      failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5', 10),
      successThreshold: parseInt(process.env.CIRCUIT_BREAKER_SUCCESS_THRESHOLD || '2', 10),
      timeoutMs: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT_MS || '60000', 10),
      halfOpenMaxCalls: parseInt(process.env.CIRCUIT_BREAKER_HALF_OPEN_CALLS || '3', 10),
    };
    this.sanhabCircuitBreaker = new CircuitBreaker(circuitBreakerConfig);
    this.logger.info('Sanhab Circuit Breaker initialized', { config: circuitBreakerConfig });
  }

  private sanhabCircuitBreaker: CircuitBreaker;

  private async sleep(ms: number): Promise<void> {
    await new Promise((r) => setTimeout(r, ms));
  }

  private async fetchWithRetry(url: string, init: RequestInit, opts: { timeoutMs: number; retries: number; baseDelayMs: number }) {
    let lastErr: any;
    for (let attempt = 0; attempt <= opts.retries; attempt++) {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), opts.timeoutMs);
      try {
        const res = await fetch(url, { ...init, signal: controller.signal });
        clearTimeout(t);
        return res;
      } catch (e: any) {
        clearTimeout(t);
        lastErr = e;

        const isTimeout = e?.name === 'AbortError';
        if (attempt >= opts.retries) {
          const err = new Error(isTimeout ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE');
          (err as any).cause = e;
          (err as any).errorCode = isTimeout ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE';
          throw err;
        }

        const delay = opts.baseDelayMs * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }
    throw lastErr;
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

    const envelope = createEventEnvelope({
      eventId: event.sanhabEventId,
      eventType: 'SanhabEventReceived',
      eventVersion: 1,
      occurredAt: event.receivedAt,
      producer: 'regulatory-gateway-service',
      correlationId: event.correlationId,
      subject: { externalEventId: event.externalEventId },
      payload: {
        externalEventId: event.externalEventId,
        source: event.source,
        eventType: event.eventType,
        payload: event.payload,
      },
    });

    await this.kafkaProducer.send({
      topic: 'insurance.regulatory.sanhab.event_received',
      messages: [
        {
          key: event.externalEventId,
          value: JSON.stringify(envelope),
          headers: {
            'x-correlation-id': event.correlationId,
            'x-event-type': envelope.eventType,
            'x-event-version': String(envelope.eventVersion),
          },
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

    // Verify Sanhab webhook signature when a secret is configured
    const webhookSecret = process.env.SANHAB_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = headers['x-sanhab-signature'] || headers['X-Sanhab-Signature'];
      const expected = this.computeWebhookSignature(body, webhookSecret);
      if (!signature || signature !== expected) {
        this.logger.warn('Sanhab webhook signature verification failed', { correlationId });
        return {
          status: 401,
          result: { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid webhook signature' }, correlationId },
        };
      }
    }

    const externalEventId = body.externalEventId || uuidv4();
    const tenantId = body.payload?.tenantId || null;

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

    const saved = await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const event = manager.create(SanhabEvent, {
        externalEventId,
        tenantId,
        eventType: body.eventType,
        source: 'sanhab',
        correlationId,
        payload: body.payload ?? {},
        headers,
      });
      const result = await manager.save(event);

      await outbox.publish({
        topic: 'insurance.regulatory.sanhab.event_received',
        eventType: 'SanhabEventReceived',
        eventVersion: 1,
        correlationId,
        subject: { externalEventId: result.externalEventId },
        payload: {
          externalEventId: result.externalEventId,
          tenantId: result.tenantId,
          source: result.source,
          eventType: result.eventType,
          payload: result.payload,
        },
      });

      return result;
    });

    return {
      status: 202,
      result: { success: true, data: { accepted: true, sanhabEventId: saved.sanhabEventId, externalEventId }, correlationId },
    };
  }

  private computeWebhookSignature(body: any, secret: string): string {
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  async simulate(params: { correlationId: string; tenantId?: string; actorUserId?: string; body: SanhabSimulateBody }): Promise<{ status: number; result: any }> {
    const { correlationId, tenantId, actorUserId, body } = params;

    if (!body?.eventType) {
      return {
        status: 400,
        result: { success: false, error: { code: 'VALIDATION_ERROR', message: 'eventType is required' }, correlationId },
      };
    }

    const externalEventId = uuidv4();

    const saved = await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const event = manager.create(SanhabEvent, {
        externalEventId,
        tenantId: tenantId || body.tenantId || null,
        eventType: body.eventType,
        source: 'simulation',
        correlationId,
        payload: {
          ...(body.payload ?? {}),
          actorUserId: actorUserId || null,
        },
        headers: null,
      });
      const result = await manager.save(event);

      await outbox.publish({
        topic: 'insurance.regulatory.sanhab.event_received',
        eventType: 'SanhabEventReceived',
        eventVersion: 1,
        correlationId,
        subject: { externalEventId: result.externalEventId },
        payload: {
          externalEventId: result.externalEventId,
          tenantId: result.tenantId,
          source: result.source,
          eventType: result.eventType,
          payload: result.payload,
        },
      });

      return result;
    });

    return {
      status: 201,
      result: { success: true, data: { simulated: true, sanhabEventId: saved.sanhabEventId, externalEventId }, correlationId },
    };
  }

  async listEvents(params: { correlationId: string; tenantId?: string; limit: number; offset: number; eventType?: string }) {
    const take = Math.min(params.limit || 50, 200);
    const skip = params.offset || 0;

    const qb = this.sanhabRepo.createQueryBuilder('e');
    if (params.tenantId) {
      qb.andWhere('e.tenant_id = :tenantId', { tenantId: params.tenantId });
    }
    if (params.eventType) {
      qb.andWhere('e.event_type = :eventType', { eventType: params.eventType });
    }

    qb.orderBy('e.received_at', 'DESC').take(take).skip(skip);

    const [items, total] = await qb.getManyAndCount();

    const data = items.map((event) => ({
      sanhabEventId: event.sanhabEventId,
      tenantId: event.tenantId,
      externalEventId: event.externalEventId,
      eventType: event.eventType,
      source: event.source,
      correlationId: event.correlationId,
      receivedAt: event.receivedAt,
    }));

    return {
      success: true,
      data,
      pagination: { total, limit: take, offset: skip },
      correlationId: params.correlationId,
    };
  }

  getCircuitBreakerStats() {
    return this.sanhabCircuitBreaker.getStats();
  }

  resetCircuitBreaker() {
    this.logger.info('Resetting Sanhab Circuit Breaker');
    this.sanhabCircuitBreaker.reset();
  }

  async inquiry(params: {
    correlationId: string;
    tenantId?: string;
    actorUserId?: string;
    authorization?: string;
    body: SanhabInquiryBody;
  }): Promise<{ status: number; result: any }> {
    const { correlationId, tenantId, actorUserId, authorization, body } = params;

    const hasNat = typeof body?.nationalId === 'string' && body.nationalId.length > 0;
    const hasCode = typeof body?.uniqueCode === 'string' && body.uniqueCode.length > 0;
    const hasPolicy = typeof body?.policyNumber === 'string' && body.policyNumber.length > 0;
    const hasVin = typeof body?.vin === 'string' && body.vin.length > 0;

    let method: SanhabInquiryMethod | null = null;
    let sanhabResponse: any = null;

    try {
      // Check circuit breaker state before making the call
      const cbStats = this.sanhabCircuitBreaker.getStats();
      if (cbStats.state === 'OPEN') {
        this.logger.warn('Sanhab Circuit Breaker is OPEN, rejecting inquiry', { correlationId, cbStats });

        await this.failureRepo.save(
          this.failureRepo.create({
            correlationId,
            tenantId: tenantId || null,
            actorUserId: actorUserId || null,
            operation: 'sanhab.inquiry',
            upstream: 'sanhab',
            errorCode: 'CIRCUIT_BREAKER_OPEN',
            httpStatus: 503,
            errorMessage: 'Circuit breaker is OPEN, Sanhab calls are blocked',
            errorStack: null,
            requestJson: body,
            responseJson: { circuitBreakerState: cbStats.state },
            createdAt: new Date(),
          })
        );

        return {
          status: 503,
          result: {
            success: false,
            error: { code: 'CIRCUIT_BREAKER_OPEN', message: 'Sanhab service is temporarily unavailable due to circuit breaker' },
            correlationId,
            circuitBreakerState: cbStats.state,
          },
        };
      }

      // Execute inquiry through circuit breaker
      sanhabResponse = await this.sanhabCircuitBreaker.execute(async () => {
        if (hasNat && hasCode) {
          method = 'nationalId_uniqueCode';
          return await this.sanhabClient.inquiryByNationalIdAndUniqueCode({
            nationalId: body.nationalId!,
            uniqueCode: body.uniqueCode!,
          });
        } else if (hasPolicy) {
          method = 'policyNumber';
          return await this.sanhabClient.inquiryByPolicyNumber({
            policyNumber: body.policyNumber!,
          });
        } else if (hasVin) {
          method = 'vin';
          return await this.sanhabClient.inquiryByVin({
            vin: body.vin!,
          });
        } else {
          throw new Error('VALIDATION_ERROR: Provide (nationalId + uniqueCode) or policyNumber or vin');
        }
      });

      const resultCode = sanhabResponse.resultCode;

      const data: any = {
        method,
        resultCode,
        inquiry: {
          nationalId: body.nationalId || null,
          uniqueCode: body.uniqueCode || null,
          policyNumber: body.policyNumber || null,
          vin: body.vin || null,
        },
        match: resultCode === 'OK',
        payload: resultCode === 'OK' ? sanhabResponse : null,
      };

      // On failure-like results, create a human follow-up WorkItem in orchestrator
      if (resultCode === 'MISMATCH' || resultCode === 'PENDING_SYNC' || resultCode === 'UPSTREAM_ERROR') {
        const orchestratorUrl = process.env.ORCHESTRATOR_URL;
        if (typeof orchestratorUrl === 'string' && orchestratorUrl.length > 0 && typeof authorization === 'string' && authorization.length > 0) {
          try {
            const wiRes = await this.fetchWithRetry(
              `${orchestratorUrl}/work-items/sanhab-followup`,
              {
                method: 'POST',
                headers: {
                  'content-type': 'application/json',
                  'x-correlation-id': correlationId,
                  ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
                  ...(actorUserId ? { 'x-user-id': actorUserId } : {}),
                  authorization,
                },
                body: JSON.stringify({
                  reasonCode: resultCode,
                  inquiry: data.inquiry,
                  result: { resultCode, payload: data.payload },
                  priority: 'high',
                }),
              },
              {
                timeoutMs: parseInt(process.env.ORCHESTRATOR_TIMEOUT_MS || '2500', 10),
                retries: parseInt(process.env.ORCHESTRATOR_RETRIES || '2', 10),
                baseDelayMs: parseInt(process.env.ORCHESTRATOR_RETRY_BASE_DELAY_MS || '250', 10),
              }
            );

            const wiJson = (await wiRes.json().catch(() => null)) as any;
            if (wiRes.ok && wiJson && wiJson.success === true && wiJson.data?.workItemId) {
              data.workItemId = String(wiJson.data.workItemId);
              data.workItemSagaId = wiJson.data?.sagaId ? String(wiJson.data.sagaId) : undefined;
            } else {
              data.workItemError = {
                httpStatus: wiRes.status,
                message: wiJson?.error?.message || 'Failed to create SANHAB follow-up work item',
              };

              await this.failureRepo.save(
                this.failureRepo.create({
                  correlationId,
                  tenantId: tenantId || null,
                  actorUserId: actorUserId || null,
                  operation: 'sanhab.inquiry.create_work_item',
                  upstream: 'orchestrator',
                  errorCode: 'UPSTREAM_ERROR',
                  httpStatus: wiRes.status,
                  errorMessage: data.workItemError.message,
                  errorStack: null,
                  requestJson: {
                    url: `${orchestratorUrl}/work-items/sanhab-followup`,
                    reasonCode: resultCode,
                  },
                  responseJson: wiJson && typeof wiJson === 'object' ? wiJson : { raw: wiJson },
                  createdAt: new Date(),
                })
              );
            }
          } catch (e: any) {
            const errorCode = (e as any)?.errorCode || 'UPSTREAM_UNAVAILABLE';
            data.workItemError = { message: e?.message || String(e), errorCode };

            await this.failureRepo.save(
              this.failureRepo.create({
                correlationId,
                tenantId: tenantId || null,
                actorUserId: actorUserId || null,
                operation: 'sanhab.inquiry.create_work_item',
                upstream: 'orchestrator',
                errorCode: String(errorCode),
                httpStatus: null,
                errorMessage: e?.message ? String(e.message) : String(e),
                errorStack: e?.stack ? String(e.stack) : null,
                requestJson: {
                  url: `${orchestratorUrl}/work-items/sanhab-followup`,
                  reasonCode: resultCode,
                },
                responseJson: null,
                createdAt: new Date(),
              })
            );
          }
        }
      }

      this.logger.info('sanhab.inquiry', { correlationId, tenantId, actorUserId, method, resultCode });

      const externalEventId = uuidv4();

      const saved = await this.dataSource.transaction(async (manager) => {
        const outbox = new OutboxPublisher(manager);
        const event = manager.create(SanhabEvent, {
          externalEventId,
          tenantId: tenantId || null,
          eventType: 'SanhabInquiry',
          source: 'inquiry',
          correlationId,
          payload: {
            actorUserId: actorUserId || null,
            request: body,
            response: data,
          },
          headers: null,
        });
        const result = await manager.save(event);

        await outbox.publish({
          topic: 'insurance.regulatory.sanhab.event_received',
          eventType: 'SanhabEventReceived',
          eventVersion: 1,
          correlationId,
          subject: { externalEventId: result.externalEventId },
          payload: {
            externalEventId: result.externalEventId,
            source: result.source,
            eventType: result.eventType,
            payload: result.payload,
          },
        });

        return result;
      });

      return {
        status: 200,
        result: { success: true, data, correlationId },
      };
    } catch (e: any) {
      this.logger.error('sanhab.inquiry.error', e, { correlationId });
      
      return {
        status: 502,
        result: {
          success: false,
          error: { code: 'SANHAB_ERROR', message: e?.message || 'Sanhab inquiry failed' },
          correlationId,
        },
      };
    }
  }

  async sanhabHealthCheck(): Promise<{ healthy: boolean; message: string; latencyMs?: number }> {
    try {
      if (this.sanhabClient.healthCheck) {
        return await this.sanhabClient.healthCheck();
      } else {
        return { healthy: true, message: 'Using Mock Sanhab Client (development mode)' };
      }
    } catch (error: any) {
      return { healthy: false, message: `Sanhab health check failed: ${error?.message || String(error)}` };
    }
  }
}
