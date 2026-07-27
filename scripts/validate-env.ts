import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface EnvCheck {
  name: string;
  required: boolean;
  defaultValue?: string;
}

const REQUIRED_ENV: EnvCheck[] = [
  { name: 'DB_HOST', required: true, defaultValue: 'localhost' },
  { name: 'DB_PORT', required: true, defaultValue: '5432' },
  { name: 'DB_USERNAME', required: true, defaultValue: 'postgres' },
  { name: 'DB_PASSWORD', required: true, defaultValue: 'postgres' },
  { name: 'DB_DATABASE', required: true, defaultValue: 'insurance_platform' },
  { name: 'JWT_SECRET', required: true, defaultValue: 'your-secret-key-here' },
  { name: 'KAFKA_BROKERS', required: true, defaultValue: 'localhost:9092' },
];

const OPTIONAL_ENV: EnvCheck[] = [
  { name: 'SANHAB_WSDL_URL', required: false },
  { name: 'SANHAB_API_KEY', required: false },
  { name: 'TWILIO_ACCOUNT_SID', required: false },
  { name: 'TWILIO_AUTH_TOKEN', required: false },
  { name: 'KAVENEGAR_API_KEY', required: false },
  { name: 'PAYMENT_GATEWAY_URL', required: false },
];

function checkEnv(checks: EnvCheck[]): { ok: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const check of checks) {
    const value = process.env[check.name];
    if (!value || value === check.defaultValue) {
      if (check.required) {
        missing.push(check.name);
      } else {
        warnings.push(check.name);
      }
    }
  }

  return { ok: missing.length === 0, missing, warnings };
}

function main() {
  console.log('🔍 Validating environment variables...\n');

  const required = checkEnv(REQUIRED_ENV);
  const optional = checkEnv(OPTIONAL_ENV);

  if (required.missing.length > 0) {
    console.log('❌ Missing required environment variables:');
    for (const name of required.missing) {
      console.log(`   - ${name}`);
    }
  } else {
    console.log('✅ All required environment variables are set');
  }

  if (optional.warnings.length > 0) {
    console.log('\n⚠️  Optional environment variables not set (external integrations will use mock/stub mode):');
    for (const name of optional.warnings) {
      console.log(`   - ${name}`);
    }
  }

  if (required.ok) {
    console.log('\n🎉 Environment is ready for local development');
    process.exit(0);
  } else {
    console.log('\n❌ Environment validation failed. Please set the missing variables.');
    process.exit(1);
  }
}

main();
