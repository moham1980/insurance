import { createLogger } from '@insurance/shared';

export const auditLogger = createLogger({
  serviceName: 'orchestrator-service',
  level: process.env.LOG_LEVEL || 'info',
  prettyPrint: process.env.NODE_ENV !== 'production',
});
