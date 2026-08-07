import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('rm_complaints')
@Index(['tenantId'])
@Index(['status', 'updatedAt'])
@Index(['complaintType', 'updatedAt'])
@Index(['tenantId', 'status'])
export class RmComplaintOps {
  @PrimaryColumn({ name: 'complaint_id', type: 'uuid' })
  complaintId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'complaint_type', type: 'text' })
  complaintType: string;

  @Column({ name: 'status', type: 'text' })
  status: string;

  @Column({ name: 'policy_id', type: 'uuid', nullable: true })
  policyId: string | null;

  @Column({ name: 'claim_id', type: 'uuid', nullable: true })
  claimId: string | null;

  @Column({ name: 'policy_number', type: 'text', nullable: true })
  policyNumber: string | null;

  @Column({ name: 'complainant_mobile', type: 'text', nullable: true })
  complainantMobile: string | null;

  @Column({ name: 'complainant_mobile_verified', type: 'boolean', default: false })
  complainantMobileVerified: boolean;

  @Column({ name: 'complainant_mobile_verified_at', type: 'timestamptz', nullable: true })
  complainantMobileVerifiedAt: Date | null;

  @Column({ name: 'assigned_to', type: 'text', nullable: true })
  assignedTo: string | null;

  @Column({ name: 'sla_first_response_due_at', type: 'timestamptz', nullable: true })
  slaFirstResponseDueAt: Date | null;

  @Column({ name: 'sla_resolution_due_at', type: 'timestamptz', nullable: true })
  slaResolutionDueAt: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz', nullable: true })
  createdAt: Date | null;

  @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date | null;

  @Column({ name: 'last_event_id', type: 'uuid', nullable: true })
  lastEventId: string | null;

  @Column({ name: 'last_event_version', type: 'int', nullable: true })
  lastEventVersion: number | null;

  @Column({ name: 'last_occurred_at', type: 'timestamptz', nullable: true })
  lastOccurredAt: Date | null;

  // P0 fix: store attachment metadata from ComplaintAttachmentAdded events
  // to prevent silent data loss. Each entry: { attachmentId, fileName, fileType, uploadedAt, uploadedBy }
  @Column({ name: 'attachments', type: 'jsonb', nullable: true })
  attachments: Array<{ attachmentId: string; fileName?: string; fileType?: string; uploadedAt?: string; uploadedBy?: string }> | null;
}
