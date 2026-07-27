import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ConsumedEvent } from '@insurance/shared';
import { RmPolicyLifecycle } from './entities/RmPolicyLifecycle';
import { RmClaimPayment } from './entities/RmClaimPayment';
import { RmFraudSignal } from './entities/RmFraudSignal';
import { RmRiCeded } from './entities/RmRiCeded';
import { RmRiBorderaux } from './entities/RmRiBorderaux';
import { RmRiRecovery } from './entities/RmRiRecovery';
import { RmClaimDocumentsAttached } from './entities/RmClaimDocumentsAttached';
import { RmFraudCaseEscalation } from './entities/RmFraudCaseEscalation';
import { RmComplaintSlaBreach } from './entities/RmComplaintSlaBreach';
import { KpiSnapshot } from './entities/KpiSnapshot';
import { KpiIngestionAudit } from './entities/KpiIngestionAudit';
import { KpiGovernancePolicy } from './entities/KpiGovernancePolicy';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
  schema: process.env.DB_SCHEMA || 'reporting',
  entities: [
    RmPolicyLifecycle,
    RmClaimPayment,
    RmFraudSignal,
    RmRiCeded,
    RmRiBorderaux,
    RmRiRecovery,
    RmClaimDocumentsAttached,
    RmFraudCaseEscalation,
    RmComplaintSlaBreach,
    KpiSnapshot,
    KpiIngestionAudit,
    KpiGovernancePolicy,
    ConsumedEvent,
  ],
  migrations: [__dirname + '/migrations/*.{js,ts}'],
});
