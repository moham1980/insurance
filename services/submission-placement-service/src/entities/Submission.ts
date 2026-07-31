import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from 'typeorm';

export type SubmissionStatus =
  | 'draft'
  | 'submitted'
  | 'rfq_in_progress'
  | 'quoted'
  | 'quote_expired'
  | 'selected'
  | 'placed'
  | 'bind_failed'
  | 'cancelled'
  | 'referred';

@Entity('submissions')
@Index(['tenantId'])
@Index(['brokerOrganizationId'])
@Index(['productId'])
@Index(['partyId'])
@Index(['tenantId', 'status'])
@Index(['idempotencyKey'], { unique: true, where: '"idempotency_key" IS NOT NULL' })
export class Submission {
  @PrimaryGeneratedColumn('uuid', { name: 'submission_id' })
  submissionId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'broker_tenant_id', type: 'uuid', nullable: true })
  brokerTenantId!: string | null;

  @Column({ name: 'broker_organization_id', type: 'uuid' })
  brokerOrganizationId!: string;

  @Column({ name: 'broker_license_id', type: 'uuid', nullable: true })
  brokerLicenseId!: string | null;

  @Column({ name: 'party_id', type: 'uuid' })
  partyId!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ name: 'product_version', type: 'int' })
  productVersion!: number;

  @Column({ name: 'line_of_business', type: 'text' })
  lineOfBusiness!: string;

  @Column({ name: 'status', type: 'text', default: 'draft' })
  status!: SubmissionStatus;

  @Column({ name: 'exposure', type: 'jsonb' })
  exposure!: Record<string, any>;

  @Column({ name: 'requested_deductibles', type: 'jsonb', nullable: true })
  requestedDeductibles!: Record<string, any>[] | null;

  @Column({ name: 'documents', type: 'jsonb', nullable: true })
  documents!: Record<string, any>[] | null;

  @Column({ name: 'effective_from', type: 'timestamptz' })
  effectiveFrom!: Date;

  @Column({ name: 'effective_to', type: 'timestamptz' })
  effectiveTo!: Date;

  @Column({ name: 'territory', type: 'text', nullable: true })
  territory!: string | null;

  @Column({ name: 'distribution_agreement_id', type: 'uuid', nullable: true })
  distributionAgreementId!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @Column({ name: 'idempotency_key', type: 'text', nullable: true })
  idempotencyKey!: string | null;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy!: string | null;

  @VersionColumn({ name: 'version', type: 'int', default: 0 })
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
