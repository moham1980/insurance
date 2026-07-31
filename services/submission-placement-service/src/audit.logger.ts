import { createLogger } from '@insurance/shared';

export const auditLogger = createLogger({ serviceName: 'submission-placement', level: process.env.LOG_LEVEL || 'info' });
