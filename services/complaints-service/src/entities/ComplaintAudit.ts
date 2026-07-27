import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ComplaintAuditEventType =
  | 'created'
  | 'status_changed'
  | 'escalated'
  | 'attachment_added'
  | 'mobile_otp_requested'
  | 'mobile_verified'
  | 'central_insurance_sent';

@Entity('complaint_audit')
@Index(['complaintId', 'createdAt'])
@Index(['eventType', 'createdAt'])
export class ComplaintAudit {
  @PrimaryGeneratedColumn('uuid', { name: 'audit_id' })
  auditId!: string;

  @Column({ name: 'complaint_id', type: 'uuid' })
  complaintId!: string;

  @Column({ name: 'event_type', type: 'text' })
  eventType!: ComplaintAuditEventType;

  @Column({ name: 'correlation_id', type: 'text', nullable: true })
  correlationId!: string | null;

  @Column({ name: 'tenant_id', type: 'text', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'actor_user_id', type: 'text', nullable: true })
  actorUserId!: string | null;

  @Column({ name: 'from_status', type: 'text', nullable: true })
  fromStatus!: string | null;

  @Column({ name: 'to_status', type: 'text', nullable: true })
  toStatus!: string | null;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason!: string | null;

  @Column({ name: 'details', type: 'jsonb', nullable: true })
  details!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
