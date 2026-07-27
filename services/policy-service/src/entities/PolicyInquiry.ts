import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('policy_inquiries')
@Index(['policyId', 'createdAt'])
@Index(['tenantId', 'createdAt'])
@Index(['resultCode', 'createdAt'])
export class PolicyInquiry {
  @PrimaryGeneratedColumn('uuid', { name: 'inquiry_id' })
  inquiryId!: string;

  @Column({ name: 'tenant_id', type: 'text', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'policy_id', type: 'uuid', nullable: true })
  policyId!: string | null;

  @Column({ name: 'method', type: 'text' })
  method!: 'nationalId_uniqueCode' | 'policyNumber' | 'vin' | 'unknown';

  @Column({ name: 'query', type: 'jsonb' })
  query!: Record<string, any>;

  @Column({ name: 'query_hash', type: 'text', nullable: true })
  queryHash!: string | null;

  @Column({ name: 'result_code', type: 'text' })
  resultCode!: string;

  @Column({ name: 'payload', type: 'jsonb', nullable: true })
  payload!: Record<string, any> | null;

  @Column({ name: 'work_item_id', type: 'uuid', nullable: true })
  workItemId!: string | null;

  @Column({ name: 'work_item_saga_id', type: 'uuid', nullable: true })
  workItemSagaId!: string | null;

  @Column({ name: 'provider_correlation_id', type: 'text', nullable: true })
  providerCorrelationId!: string | null;

  @Column({ name: 'provider_signature', type: 'text', nullable: true })
  providerSignature!: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'correlation_id', type: 'text', nullable: true })
  correlationId!: string | null;

  // Archival fields for data retention
  @Column({ name: 'archived', type: 'boolean', default: false })
  archived!: boolean;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
