import { Logger } from '@nestjs/common';

export interface ErrorEvent {
  schemaVersion: string;
  eventId: string;
  errorId: string;
  occurredAt: string;
  sourceType: string;
  sourceApp: string;
  service: string;
  severity: string;
  category: string;
  errorCode: string;
  httpStatus: number;
  retryable: boolean;
  safeMessage: string;
  traceId?: string;
  correlationId?: string;
  fingerprint?: string;
}

export class ErrorReporter {
  private static logger = new Logger('ErrorReporter');
  private static kafkaProducer: any = null;

  static setKafkaProducer(producer: any) {
    ErrorReporter.kafkaProducer = producer;
  }

  static async report(event: Partial<ErrorEvent>): Promise<void> {
    try {
      const fullEvent: ErrorEvent = {
        schemaVersion: '1.0',
        eventId: event.eventId || crypto.randomUUID(),
        errorId: event.errorId || crypto.randomUUID(),
        occurredAt: event.occurredAt || new Date().toISOString(),
        sourceType: event.sourceType || 'BACKEND',
        sourceApp: event.sourceApp || 'insurance-legacy',
        service: event.service || 'unknown',
        severity: event.severity || 'ERROR',
        category: event.category || 'UNKNOWN',
        errorCode: event.errorCode || 'INTERNAL_ERROR',
        httpStatus: event.httpStatus || 500,
        retryable: event.retryable ?? false,
        safeMessage: event.safeMessage || 'Internal server error',
        traceId: event.traceId,
        correlationId: event.correlationId,
        fingerprint: event.fingerprint,
      };

      const json = JSON.stringify(fullEvent);

      if (ErrorReporter.kafkaProducer) {
        await ErrorReporter.kafkaProducer.send({
          topic: 'ecosystem.error.events.v1',
          messages: [{ key: `${fullEvent.service}:${fullEvent.errorCode}`, value: json }],
        });
      } else {
        ErrorReporter.logger.log(`ErrorEvent (no Kafka): ${json}`);
      }
    } catch (e) {
      ErrorReporter.logger.error(`Failed to report error event: ${e}`);
    }
  }
}
