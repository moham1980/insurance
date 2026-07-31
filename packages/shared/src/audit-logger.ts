import { createLogger } from './observability/logger';
import { v4 as uuidv4 } from 'uuid';

export interface AuditEvent {
  auditId?: string;
  timestamp?: string;
  service: string;
  tenantId?: string;
  organizationId?: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  outcome: 'success' | 'failure' | 'denied' | 'error';
  correlationId?: string;
  metadata?: Record<string, unknown>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

class AuditLogger {
  private logger = createLogger({ serviceName: 'audit' });

  log(service: string, event: AuditEvent): void {
    const { service: _s, ...eventWithoutService } = event;
    const entry: Record<string, unknown> = {
      auditId: event.auditId || uuidv4(),
      timestamp: new Date().toISOString(),
      ...eventWithoutService,
      service,
    };
    this.logger.info('audit.event', entry);
  }

  child(service: string, tenantId?: string, userId?: string, correlationId?: string) {
    const base: Record<string, unknown> = { service };
    if (tenantId) base.tenantId = tenantId;
    if (userId) base.userId = userId;
    if (correlationId) base.correlationId = correlationId;
    return {
      log: (event: Omit<AuditEvent, 'service' | 'tenantId' | 'userId' | 'correlationId'>) =>
        this.log(service, { tenantId, userId, correlationId, ...event } as AuditEvent),
    };
  }
}

export const auditLogger = new AuditLogger();
