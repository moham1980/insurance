import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, VersionColumn } from 'typeorm';

export type KycRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type KycScreeningStatus = 'not_started' | 'in_progress' | 'passed' | 'failed' | 'manual_review';
export type KycDocumentStatus = 'not_submitted' | 'submitted' | 'verified' | 'rejected';
export type KycWorkflowStage =
  | 'data_collection'
  | 'document_verification'
  | 'aml_screening'
  | 'risk_assessment'
  | 'manual_review'
  | 'approved'
  | 'rejected'
  | 'escalated';

@Entity('kyc_reviews')
@Index(['tenantId', 'partyId', 'createdAt'])
@Index(['tenantId', 'status', 'createdAt'])
@Index(['tenantId', 'riskLevel', 'workflowStage'])
@Index(['tenantId', 'amlScreeningStatus'])
export class KycReview {
  @PrimaryGeneratedColumn('uuid', { name: 'kyc_review_id' })
  kycReviewId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ name: 'party_id', type: 'uuid' })
  partyId!: string;

  @Column({ name: 'status', type: 'text', default: 'pending' })
  status!: 'pending' | 'approved' | 'rejected';

  @Column({ name: 'workflow_stage', type: 'text', default: 'data_collection' })
  workflowStage!: KycWorkflowStage;

  @Column({ name: 'reviewer_user_id', type: 'text', nullable: true })
  reviewerUserId!: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt!: Date | null;

  // Risk Assessment
  @Column({ name: 'risk_level', type: 'text', nullable: true })
  riskLevel!: KycRiskLevel | null;

  @Column({ name: 'risk_score', type: 'int', nullable: true })
  riskScore!: number | null;

  @Column({ name: 'risk_factors', type: 'jsonb', nullable: true })
  riskFactors!: string[] | null;

  // AML Screening
  @Column({ name: 'aml_screening_status', type: 'text', default: 'not_started' })
  amlScreeningStatus!: KycScreeningStatus;

  @Column({ name: 'pep_screening_status', type: 'text', nullable: true })
  pepScreeningStatus!: KycScreeningStatus | null;

  @Column({ name: 'sanctions_screening_status', type: 'text', nullable: true })
  sanctionsScreeningStatus!: KycScreeningStatus | null;

  @Column({ name: 'adverse_media_status', type: 'text', nullable: true })
  adverseMediaStatus!: KycScreeningStatus | null;

  @Column({ name: 'screening_results', type: 'jsonb', nullable: true })
  screeningResults!: Record<string, any> | null;

  @Column({ name: 'screened_at', type: 'timestamptz', nullable: true })
  screenedAt!: Date | null;

  // Document Verification
  @Column({ name: 'document_status', type: 'text', default: 'not_submitted' })
  documentStatus!: KycDocumentStatus;

  @Column({ name: 'document_types', type: 'jsonb', nullable: true })
  documentTypes!: string[] | null;

  @Column({ name: 'document_verified_at', type: 'timestamptz', nullable: true })
  documentVerifiedAt!: Date | null;

  // Escalation
  @Column({ name: 'escalation_reason', type: 'text', nullable: true })
  escalationReason!: string | null;

  @Column({ name: 'escalated_at', type: 'timestamptz', nullable: true })
  escalatedAt!: Date | null;

  @Column({ name: 'escalated_to', type: 'text', nullable: true })
  escalatedTo!: string | null;

  // SLA
  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  dueDate!: Date | null;

  @VersionColumn({ name: 'version', default: 0 })
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;
}
