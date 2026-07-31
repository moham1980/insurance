import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('rm_aml')
@Index(['transactionId'])
@Index(['partyId'])
@Index(['status'])
@Index(['riskLevel'])
@Index(['createdAt'])
@Index(['brokerOrganizationId'])
export class RmAml {
  @Column({ type: 'uuid', name: 'tenant_id', nullable: true })
  tenantId?: string | null;

  @PrimaryGeneratedColumn('uuid', { name: 'transaction_id' })
  transactionId!: string;

  @Column({ name: 'party_id', type: 'uuid' })
  partyId!: string;

  @Column({ name: 'party_name', type: 'text' })
  partyName!: string;

  @Column({ name: 'transaction_type', type: 'text' })
  transactionType!: string;

  @Column({ name: 'amount', type: 'numeric' })
  amount!: string;

  @Column({ name: 'currency', type: 'text', default: 'IRR' })
  currency!: string;

  @Column({ name: 'status', type: 'text' })
  status!: string;

  @Column({ name: 'risk_level', type: 'text', nullable: true })
  riskLevel!: string | null;

  @Column({ name: 'risk_score', type: 'int', nullable: true })
  riskScore!: number | null;

  @Column({ name: 'matched_rules', type: 'jsonb', nullable: true })
  matchedRules!: Record<string, any>[] | null;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason!: string | null;

  @Column({ name: 'escalated_at', type: 'timestamptz', nullable: true })
  escalatedAt!: Date | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @Column({ name: 'resolution', type: 'text', nullable: true })
  resolution!: string | null;

  @Column({ name: 'reference_type', type: 'text', nullable: true })
  referenceType!: string | null;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId!: string | null;

  @Column({ name: 'broker_organization_id', type: 'uuid', nullable: true })
  brokerOrganizationId!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
