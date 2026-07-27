import { createLogger } from '@insurance/shared';

export const auditLogger = createLogger({
  serviceName: 'sales-network-service',
  prettyPrint: process.env.NODE_ENV !== 'production',
});
