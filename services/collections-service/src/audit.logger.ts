import { createLogger } from '@insurance/shared';

export const auditLogger = createLogger({
  serviceName: 'collections-service',
  level: process.env.LOG_LEVEL || 'info',
  prettyPrint: process.env.LOG_PRETTY === 'true',
});
