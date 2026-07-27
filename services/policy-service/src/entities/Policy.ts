import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from 'typeorm';

@Entity('policies')
@Index(['tenantId', 'policyNumber'], { unique: true })
@Index(['tenantId', 'uniqueCode'], { unique: true, where: '"unique_code" IS NOT NULL' })
@Index(['status', 'updatedAt'])
@Index(['partyId'])
@Index(['tenantId'])
@Index(['idempotencyKey'], { unique: true, where: '"idempotency_key" IS NOT NULL' })
export class Policy {
  @PrimaryGeneratedColumn('uuid', { name: 'policy_id' })
  policyId!: string;

  @Column({ name: 'tenant_id', type: 'text', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'policy_number', type: 'text' })
  policyNumber!: string;

  // Senhab Unique Code (کد یکتا) - without this, policy may be considered invalid by regulator.
  @Column({ name: 'unique_code', type: 'text', nullable: true })
  uniqueCode!: string | null;

  @Column({ name: 'status', type: 'text', default: 'inquiry' })
  status!:
    | 'inquiry'
    | 'docs_pending'
    | 'uw_pending'
    | 'uw_rejected'
    | 'risk_assessed'
    | 'issued'
    | 'active'
    | 'endorsed'
    | 'cancelled'
    | 'renewed';

  // Party reference from Party/KYC service
  @Column({ name: 'party_id', type: 'uuid' })
  partyId!: string;

  // Sales network attribution (agency/brokerage orgUnitId) for commission/KPI.
  @Column({ name: 'producer_org_unit_id', type: 'uuid', nullable: true })
  producerOrgUnitId!: string | null;

  @Column({ name: 'line_of_business', type: 'text' })
  lineOfBusiness!: string;

  @Column({ name: 'start_date', type: 'timestamptz' })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'timestamptz' })
  endDate!: Date;

  @Column({ name: 'premium_amount', type: 'numeric' })
  premiumAmount!: number;

  @Column({ name: 'coverages', type: 'jsonb', nullable: true })
  coverages!: Record<string, any> | null;

  @Column({ name: 'deductibles', type: 'jsonb', nullable: true })
  deductibles!: Record<string, any> | null;

  @Column({ name: 'installments', type: 'jsonb', nullable: true })
  installments!: Array<Record<string, any>> | null;

  // Holds data gathered in stage 2 (جمع‌آوری اطلاعات و مدارک)
  @Column({ name: 'application_data', type: 'jsonb', nullable: true })
  applicationData!: Record<string, any> | null;

  // Holds output of stage 3 (ارزیابی ریسک)
  @Column({ name: 'risk_assessment', type: 'jsonb', nullable: true })
  riskAssessment!: Record<string, any> | null;

  // Auto-renewal fields
  @Column({ name: 'auto_renew', type: 'boolean', default: false })
  autoRenew!: boolean;

  @Column({ name: 'renewal_count', type: 'int', default: 0 })
  renewalCount!: number;

  @Column({ name: 'max_renewals', type: 'int', default: 10 })
  maxRenewals!: number;

  @Column({ name: 'renewal_parent_id', type: 'uuid', nullable: true })
  renewalParentId!: string | null;

  @Column({ name: 'renewal_reminder_sent_at', type: 'timestamptz', nullable: true })
  renewalReminderSentAt!: Date | null;

  @Column({ name: 'renewal_notified_at', type: 'timestamptz', nullable: true })
  renewalNotifiedAt!: Date | null;

  // Archival fields for data retention
  @Column({ name: 'archived', type: 'boolean', default: false })
  archived!: boolean;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt!: Date | null;

  @Column({ name: 'idempotency_key', type: 'text', nullable: true })
  idempotencyKey!: string | null;

  @VersionColumn({ name: 'version', type: 'int', default: 0 })
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
