import { createLogger, redactPiiInObject, Logger } from '@insurance/shared';

function redactIfObject(value: unknown): unknown {
  return value && typeof value === 'object' ? redactPiiInObject(value) : value;
}

class RedactingAuditLogger extends Logger {
  constructor() {
    super({
      serviceName: 'underwriting-service',
      prettyPrint: process.env.NODE_ENV !== 'production',
    });
  }

  info(msg: string, context?: Record<string, unknown>): void {
    super.info(msg, redactIfObject(context) as Record<string, unknown> | undefined);
  }

  warn(msg: string, context?: Record<string, unknown>): void {
    super.warn(msg, redactIfObject(context) as Record<string, unknown> | undefined);
  }

  error(msg: string, error?: Error, context?: Record<string, unknown>): void {
    super.error(msg, error, redactIfObject(context) as Record<string, unknown> | undefined);
  }

  debug(msg: string, context?: Record<string, unknown>): void {
    super.debug(msg, redactIfObject(context) as Record<string, unknown> | undefined);
  }

  child(bindings: Record<string, unknown>): Logger {
    return super.child(redactIfObject(bindings) as Record<string, unknown>);
  }
}

export const auditLogger = new RedactingAuditLogger();
