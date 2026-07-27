import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ComplaintType =
  | 'issuance'
  | 'claims_with_case'
  | 'claims_without_case'
  | 'agent'
  | 'broker'
  | 'loss_adjuster'
  | 'unauthorized_office'
  | 'fund'
  | 'other';

export type ComplaintStatus = 'open' | 'in_review' | 'resolved' | 'closed' | 'escalated';

@Entity('complaints')
@Index(['status', 'createdAt'])
@Index(['complaintType', 'createdAt'])
@Index(['policyNumber'])
@Index(['claimId'])
@Index(['complainantNationalId'])
export class Complaint {
  @PrimaryGeneratedColumn('uuid', { name: 'complaint_id' })
  complaintId!: string;

  @Column({ name: 'complaint_type', type: 'text' })
  complaintType!: ComplaintType;

  @Column({ name: 'status', type: 'text', default: 'open' })
  status!: ComplaintStatus;

  @Column({ name: 'policy_company_name', type: 'text', nullable: true })
  policyCompanyName!: string | null;

  @Column({ name: 'policy_number', type: 'text', nullable: true })
  policyNumber!: string | null;

  @Column({ name: 'policy_title', type: 'text', nullable: true })
  policyTitle!: string | null;

  @Column({ name: 'policy_id', type: 'text', nullable: true })
  policyId!: string | null;

  @Column({ name: 'claim_id', type: 'text', nullable: true })
  claimId!: string | null;

  @Column({ name: 'complainant_national_id', type: 'text', nullable: true })
  complainantNationalId!: string | null;

  @Column({ name: 'complainant_birth_date', type: 'date', nullable: true })
  complainantBirthDate!: string | null;

  @Column({ name: 'complainant_mobile', type: 'text', nullable: true })
  complainantMobile!: string | null;

  @Column({ name: 'complainant_mobile_verified', type: 'boolean', default: false })
  complainantMobileVerified!: boolean;

  @Column({ name: 'complainant_mobile_verified_at', type: 'timestamptz', nullable: true })
  complainantMobileVerifiedAt!: Date | null;

  @Column({ name: 'complainant_address', type: 'text', nullable: true })
  complainantAddress!: string | null;

  @Column({ name: 'complainant_representative_status', type: 'text', nullable: true })
  complainantRepresentativeStatus!: string | null;

  @Column({ name: 'description', type: 'text' })
  description!: string;

  @Column({ name: 'assigned_to', type: 'text', nullable: true })
  assignedTo!: string | null;

  @Column({ name: 'sla_first_response_due_at', type: 'timestamptz', nullable: true })
  slaFirstResponseDueAt!: Date | null;

  @Column({ name: 'sla_resolution_due_at', type: 'timestamptz', nullable: true })
  slaResolutionDueAt!: Date | null;

  @Column({ name: 'first_response_at', type: 'timestamptz', nullable: true })
  firstResponseAt!: Date | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @Column({ name: 'escalated_at', type: 'timestamptz', nullable: true })
  escalatedAt!: Date | null;

  @Column({ name: 'escalated_reason', type: 'text', nullable: true })
  escalatedReason!: string | null;

  @Column({ name: 'escalated_by', type: 'text', nullable: true })
  escalatedBy!: string | null;

  @Column({ name: 'resolution_summary', type: 'text', nullable: true })
  resolutionSummary!: string | null;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: object | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
