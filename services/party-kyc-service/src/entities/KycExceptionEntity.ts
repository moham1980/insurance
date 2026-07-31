import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('kyc_exception')
@Index(['tenantId', 'partyId'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'organizationId'])
@Index(['tenantId', 'status', 'organizationId'])
export class KycExceptionEntity {
  @PrimaryColumn({ type: 'uuid', name: 'exception_id' })
  exceptionId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ type: 'uuid', name: 'party_id' })
  partyId!: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId!: string | null;

  @Column({ name: 'kyc_review_id' })
  kycReviewId!: string;

  @Column({ name: 'exception_type', type: 'varchar' })
  exceptionType!: 'document_issue' | 'screening_failure' | 'consent_issue' | 'verification_timeout' | 'external_service_failure';

  @Column({ type: 'varchar', default: 'medium' })
  severity!: 'low' | 'medium' | 'high' | 'critical';

  @Column({ type: 'text' })
  description!: string;

  @CreateDateColumn({ name: 'raised_at' })
  raisedAt!: Date;

  @Column({ name: 'raised_by' })
  raisedBy!: string;

  @Column({ name: 'assigned_to', type: 'varchar', nullable: true })
  assignedTo!: string | null;

  @Column({ name: 'escalated_to_organization_id', type: 'uuid', nullable: true })
  escalatedToOrganizationId!: string | null;

  @Column({ type: 'varchar', default: 'pending' })
  status!: 'pending' | 'in_progress' | 'resolved' | 'escalated';

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes!: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @Column({ name: 'resolved_by', type: 'varchar', nullable: true })
  resolvedBy!: string | null;
}
