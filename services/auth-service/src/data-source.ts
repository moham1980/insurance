import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from './entities/User';
import { OrganizationUnit } from './entities/OrganizationUnit';
import { AccessAudit } from './entities/AccessAudit';
import { Session } from './entities/Session';
import { AbacPolicy } from './entities/AbacPolicy';
import { FederatedIdentity } from './entities/FederatedIdentity';
import { Organization } from './entities/Organization';
import { OrganizationCapability } from './entities/OrganizationCapability';
import { OrganizationRelationship } from './entities/OrganizationRelationship';
import { SalesNetworkMembership } from './entities/SalesNetworkMembership';
import { Tenant } from './entities/Tenant';
import { BrandConfig } from './entities/BrandConfig';
import { ChannelWorkspace } from './entities/ChannelWorkspace';
import { WorkspaceMembership } from './entities/WorkspaceMembership';
import { OutboxEvent } from '@insurance/shared';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'postgres',
  schema: process.env.DB_SCHEMA || 'public',
  entities: [User, OrganizationUnit, AccessAudit, Session, AbacPolicy, FederatedIdentity, OutboxEvent, Organization, OrganizationCapability, OrganizationRelationship, SalesNetworkMembership, Tenant, BrandConfig, ChannelWorkspace, WorkspaceMembership],
  migrations: [__dirname + '/migrations/*.{js,ts}'],
});
