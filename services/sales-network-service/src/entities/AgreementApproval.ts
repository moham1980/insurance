import { Column, Entity, Index, PrimaryColumn, CreateDateColumn } from 'typeorm';

export type AgreementApprovalDecision = 'approved' | 'rejected' | 'returned';

@Entity({ name: 'agreement_approvals' })
@Index(['agreementId'])
export class AgreementApproval {
  @PrimaryColumn('uuid', { name: 'approval_id' })
  approvalId!: string;

  @Column('uuid', { name: 'agreement_id' })
  agreementId!: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId!: string;

  @Column('uuid', { name: 'approver_organization_id', nullable: true })
  approverOrganizationId!: string | null;

  @Column({ name: 'approver_user_id', type: 'text', nullable: true })
  approverUserId!: string | null;

  @Column({ name: 'decision', type: 'text' })
  decision!: AgreementApprovalDecision;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason!: string | null;

  @Column({ name: 'conditions', type: 'jsonb', nullable: true })
  conditions!: Record<string, any> | null;

  @Column({ name: 'authority_profile_snapshot', type: 'jsonb', nullable: true })
  authorityProfileSnapshot!: Record<string, any> | null;

  @CreateDateColumn({ name: 'approved_at', type: 'timestamptz' })
  approvedAt!: Date;
}
