import { Injectable } from '@nestjs/common';
import { ConnectorConfigService } from '../connector-config.service';
import { CarrierConnectorFactory } from '../carrier-connectors/carrier-connector.factory';
import { ICarrierConnector, QuoteRequestPayload, QuoteResponsePayload } from '../carrier-connectors/carrier-connector.interface';
import { CircuitBreaker, circuitBreakerRegistry } from '@insurance/shared';
import { QuoteError } from '../entities/QuoteError';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';

export interface DispatchCarrier {
  carrierOrganizationId: string;
  connectorId?: string;
}

@Injectable()
export class QuoteDispatcher {
  constructor(
    private readonly connectorService: ConnectorConfigService,
    private readonly factory: CarrierConnectorFactory,
    @InjectRepository(QuoteError)
    private readonly errorRepo: Repository<QuoteError>,
  ) {}

  async dispatchToCarrier(
    payload: QuoteRequestPayload,
    carrier: DispatchCarrier,
  ): Promise<QuoteResponsePayload> {
    const connectorConfig = await this.connectorService.getActiveConnectorForCarrier(
      payload.tenantId,
      carrier.carrierOrganizationId,
    );
    if (!connectorConfig) {
      return {
        status: 'error',
        carrierOrganizationId: carrier.carrierOrganizationId,
        quoteRequestId: payload.quoteRequestId,
        submissionId: payload.submissionId,
        tenantId: payload.tenantId,
        premiumAmountMinor: '0',
        premiumCurrency: 'IRR',
        errorCode: 'NO_CONNECTOR',
        errorMessage: `No active connector for carrier ${carrier.carrierOrganizationId}`,
      };
    }

    const circuitName = `carrier-${carrier.carrierOrganizationId}`;
    const circuitConfig = connectorConfig.circuitBreakerConfig || {};
    const circuit = circuitBreakerRegistry.get(circuitName, {
      failureThreshold: circuitConfig.failureThreshold || 5,
      successThreshold: circuitConfig.successThreshold || 2,
      timeoutMs: circuitConfig.timeoutMs || 30000,
      resetTimeoutMs: circuitConfig.resetTimeoutMs || 60000,
    });

    try {
      const result = await circuit.execute<QuoteResponsePayload>(() =>
        this.withTimeout(
          this.factory.getConnector(connectorConfig.connectorType).requestQuote(payload, connectorConfig.config),
          connectorConfig.timeoutMs,
        ),
      );
      if (result.status === 'error') {
        await this.recordError(payload, carrier, result, connectorConfig.connectorType);
      }
      return result;
    } catch (e: any) {
      await this.recordError(payload, carrier, { errorCode: 'DISPATCH_FAILED', errorMessage: e.message } as any, connectorConfig.connectorType);
      return {
        status: 'error',
        carrierOrganizationId: carrier.carrierOrganizationId,
        quoteRequestId: payload.quoteRequestId,
        submissionId: payload.submissionId,
        tenantId: payload.tenantId,
        premiumAmountMinor: '0',
        premiumCurrency: 'IRR',
        errorCode: 'DISPATCH_FAILED',
        errorMessage: e.message || 'Quote dispatch failed',
      };
    }
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms));
    return Promise.race([promise, timeout]);
  }

  private async recordError(
    payload: QuoteRequestPayload,
    carrier: DispatchCarrier,
    result: QuoteResponsePayload,
    connectorType: string,
  ): Promise<void> {
    const error = this.errorRepo.create({
      quoteErrorId: uuidv4(),
      tenantId: payload.tenantId,
      quoteRequestId: payload.quoteRequestId,
      submissionId: payload.submissionId,
      carrierOrganizationId: carrier.carrierOrganizationId,
      carrierConnectorId: carrier.connectorId || null,
      connectorType,
      errorCode: result.errorCode || 'UNKNOWN',
      errorMessage: result.errorMessage || null,
      errorDetail: result.errorDetail || { quoteSnapshot: result.quoteSnapshot },
      occurredAt: new Date(),
    });
    await this.errorRepo.save(error);
  }
}
