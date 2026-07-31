import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('policy_projections')
@Index(['tenantId', 'policyNumber'])
@Index(['tenantId', 'placementId'])
@Index(['tenantId', 'brokerOrganizationId'])
@Index(['tenantId'])
@Index(['status', 'updatedAt'])
export class PolicyProjection {
  @PrimaryGeneratedColumn('uuid', { name: 'projection_id' })
  projectionId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ name: 'broker_organization_id', type: 'uuid', nullable: true })
  brokerOrganizationId!: string | null;

  @Column({ name: 'issuer_organization_id', type: 'uuid', nullable: true })
  issuerOrganizationId!: string | null;

  @Column({ name: 'policy_id', type: 'uuid' })
  policyId!: string;

  @Column({ name: 'policy_number', type: 'text' })
  policyNumber!: string;

  @Column({ name: 'unique_code', type: 'text', nullable: true })
  uniqueCode!: string | null;

  @Column({ name: 'placement_id', type: 'uuid' })
  placementId!: string;

  @Column({ name: 'source_system_id', type: 'text', nullable: true })
  sourceSystemId!: string | null;

  @Column({ name: 'source_version', type: 'int', default: 1 })
  sourceVersion!: number;

  @Column({ name: 'idempotency_key', type: 'text', nullable: true })
  idempotencyKey!: string | null;

  @Column({ name: 'received_at', type: 'timestamptz' })
  receivedAt!: Date;

  @Column({ name: 'payload', type: 'jsonb', nullable: true })
  payload!: Record<string, any> | null;

  @Column({ name: 'status', type: 'text', default: 'active' })
  status!: 'active' | 'superseded' | 'revoked';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
