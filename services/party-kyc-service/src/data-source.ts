import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Party } from './entities/Party';
import { PiiReference } from './entities/PiiReference';
import { KycReview } from './entities/KycReview';
import { DocumentTrustChainEntry } from './entities/DocumentTrustChainEntry';
import { IdentityProofingRecord } from './entities/IdentityProofingRecord';
import { ExternalVerificationRequestEntity } from './entities/ExternalVerificationRequestEntity';
import { KycExceptionEntity } from './entities/KycExceptionEntity';
import { ConsentRecord } from './entities/ConsentRecord';
import { PartyRoleAssignment } from './entities/PartyRoleAssignment';
import { GlobalSubject } from './entities/GlobalSubject';
import { IdentityIdentifier } from './entities/IdentityIdentifier';
import { IdentityLink } from './entities/IdentityLink';
import { BrokerLicense } from './entities/BrokerLicense';
import { OutboxEvent } from '@insurance/shared';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
  schema: process.env.DB_SCHEMA || 'public',
  entities: [Party, PiiReference, KycReview, DocumentTrustChainEntry, IdentityProofingRecord, ExternalVerificationRequestEntity, KycExceptionEntity, ConsentRecord, PartyRoleAssignment, GlobalSubject, IdentityIdentifier, IdentityLink, BrokerLicense, OutboxEvent],
  migrations: [__dirname.replace(/\\/g, '/') + '/migrations/*.js'],
});
