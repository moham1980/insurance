import { ICarrierConnector, QuoteRequestPayload, QuoteResponsePayload, BindRequestPayload, BindResponsePayload } from './carrier-connector.interface';
import { Kafka, Producer } from 'kafkajs';

export class KafkaConnectorAdapter implements ICarrierConnector {
  readonly connectorType = 'kafka';
  private producers = new Map<string, Producer>();

  private getProducer(brokers: string[]): Producer {
    const key = brokers.join(',');
    if (!this.producers.has(key)) {
      const kafka = new Kafka({ clientId: 'submission-placement', brokers });
      const producer = kafka.producer();
      this.producers.set(key, producer);
    }
    return this.producers.get(key)!;
  }

  async requestQuote(payload: QuoteRequestPayload, config: Record<string, any>): Promise<QuoteResponsePayload> {
    const brokers = (config.brokers || process.env.KAFKA_BROKERS || 'localhost:19092').split(',');
    const topic = config.quoteRequestTopic || 'insurance.carrier.quote.request';
    try {
      const producer = this.getProducer(brokers);
      await producer.connect();
      await producer.send({
        topic,
        messages: [
          {
            key: payload.quoteRequestId,
            value: JSON.stringify(payload),
            headers: { correlationId: payload.correlationId, tenantId: payload.tenantId },
          },
        ],
      });
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (config.quoteTtlMs || 30 * 60 * 1000));
      return {
        status: 'pending',
        carrierOrganizationId: payload.carrierOrganizationId,
        quoteRequestId: payload.quoteRequestId,
        submissionId: payload.submissionId,
        tenantId: payload.tenantId,
        premiumAmountMinor: '0',
        premiumCurrency: config.currency || 'IRR',
        quoteSnapshot: { source: 'kafka-connector', status: 'awaiting_response' },
        expiresAt,
      };
    } catch (e: any) {
      return {
        status: 'error',
        carrierOrganizationId: payload.carrierOrganizationId,
        quoteRequestId: payload.quoteRequestId,
        submissionId: payload.submissionId,
        tenantId: payload.tenantId,
        premiumAmountMinor: '0',
        premiumCurrency: config.currency || 'IRR',
        errorCode: 'KAFKA_QUOTE_FAILED',
        errorMessage: e.message || 'Kafka quote request failed',
      };
    }
  }

  async bind(payload: BindRequestPayload, config: Record<string, any>): Promise<BindResponsePayload> {
    const brokers = (config.brokers || process.env.KAFKA_BROKERS || 'localhost:19092').split(',');
    const topic = config.bindRequestTopic || 'insurance.carrier.bind.request';
    try {
      const producer = this.getProducer(brokers);
      await producer.connect();
      await producer.send({
        topic,
        messages: [
          {
            key: payload.placementId,
            value: JSON.stringify(payload),
            headers: { correlationId: payload.correlationId, tenantId: payload.tenantId },
          },
        ],
      });
      return { status: 'pending' };
    } catch (e: any) {
      return { status: 'failed', errorCode: 'KAFKA_BIND_FAILED', errorMessage: e.message || 'Kafka bind request failed' };
    }
  }
}
