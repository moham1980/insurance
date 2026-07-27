import 'reflect-metadata';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'unit-test-secret-min-32-characters-long';
process.env.JWT_ISSUER = process.env.JWT_ISSUER || 'auth-service-test';
process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'insurance-platform-test';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
process.env.SERVICE_JWT_EXPIRES_IN = process.env.SERVICE_JWT_EXPIRES_IN || '15m';
process.env.DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || '11111111-1111-1111-1111-111111111111';
process.env.PII_ENCRYPTION_KEY = process.env.PII_ENCRYPTION_KEY || 'unit-test-pii-key';
