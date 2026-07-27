import pino from 'pino';

export const auditLogger = pino({
  name: 'product-service-audit',
  level: process.env.AUDIT_LOG_LEVEL || 'info',
});
