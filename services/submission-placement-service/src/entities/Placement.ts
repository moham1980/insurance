import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from 'typeorm';

export type PlacementStatus =
  | 'draft'
  | 'bind_requested'
  | 'premium_reserved'
  | 'policy_issued'
  | 'policy_projected'
  | 'completed'
  | 'bind_failed'
  | 'cancelled'
  | 'compensating';

@Entity('placements')
@Index(['tenantId'])
@Index(['submissionId'])
@Index(['quoteResponseId'])
@Index(['carrierOrganizationId'])
@Index(['status'])
@Index(['idempotencyKey'], { unique: true, where: '"idempotency_key" IS NOT NULL' })
export class Placement {
  @PrimaryGeneratedColumn('uuid', { name: 'placement_id' })
  placementId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'submission_id', type: 'uuid' })
  submissionId!: string;

  @Column({ name: 'quote_request_id', type: 'uuid' })
  quoteRequestId!: string;

  @Column({ name: 'quote_response_id', type: 'uuid' })
  quoteResponseId!: string;

  @Column({ name: 'carrier_organization_id', type: 'uuid' })
  carrierOrganizationId!: string;

  @Column({ name: 'broker_organization_id', type: 'uuid' })
  brokerOrganizationId!: string;

  @Column({ name: 'broker_license_id', type: 'uuid', nullable: true })
  brokerLicenseId!: string | null;

  @Column({ name: 'status', type: 'text', default: 'draft' })
  status!: PlacementStatus;

  @Column({ name: 'bind_saga_state', type: 'text', default: 'not_started' })
  bindSagaState!: string;

  @Column({ name: 'policy_id', type: 'uuid', nullable: true })
  policyId!: string | null;

  @Column({ name: 'policy_number', type: 'text', nullable: true })
  policyNumber!: string | null;

  @Column({ name: 'premium_reservation_id', type: 'uuid', nullable: true })
  premiumReservationId!: string | null;

  @Column({ name: 'subjectivities_status', type: 'text', default: 'pending' })
  subjectivitiesStatus!: 'pending' | 'fulfilled' | 'waived' | 'failed';

  @Column({ name: 'saga_steps', type: 'jsonb', nullable: true })
  sagaSteps!: Record<string, any>[] | null;

  @Column({ name: 'bind_attempts', type: 'int', default: 0 })
  bindAttempts!: number;

  @Column({ name: 'last_error', type: 'jsonb', nullable: true })
  lastError!: Record<string, any> | null;

  @Column({ name: 'effective_from', type: 'timestamptz' })
  effectiveFrom!: Date;

  @Column({ name: 'effective_to', type: 'timestamptz' })
  effectiveTo!: Date;

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
