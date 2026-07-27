import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('rm_complaint_sla_breaches')
@Index(['occurredAt'])
@Index(['complaintId'])
@Index(['status'])
@Index(['assignedTo'])
@Index(['claimId'])
@Index(['policyId'])
export class RmComplaintSlaBreach {
  @PrimaryColumn({ name: 'event_id', type: 'text' })
  eventId!: string;

  @Column({ name: 'occurred_at', type: 'timestamptz', nullable: true })
  occurredAt!: Date | null;

  @Column({ name: 'correlation_id', type: 'text', nullable: true })
  correlationId!: string | null;

  @Column({ name: 'complaint_id', type: 'uuid' })
  complaintId!: string;

  @Column({ name: 'complaint_type', type: 'text', nullable: true })
  complaintType!: string | null;

  @Column({ name: 'status', type: 'text', nullable: true })
  status!: string | null;

  @Column({ name: 'assigned_to', type: 'text', nullable: true })
  assignedTo!: string | null;

  @Column({ name: 'policy_id', type: 'uuid', nullable: true })
  policyId!: string | null;

  @Column({ name: 'claim_id', type: 'uuid', nullable: true })
  claimId!: string | null;

  @Column({ name: 'sla_first_response_due_at', type: 'timestamptz', nullable: true })
  slaFirstResponseDueAt!: Date | null;

  @Column({ name: 'sla_resolution_due_at', type: 'timestamptz', nullable: true })
  slaResolutionDueAt!: Date | null;

  @Column({ name: 'breached_at', type: 'timestamptz', nullable: true })
  breachedAt!: Date | null;

  @Column({ name: 'sla_hours', type: 'int', nullable: true })
  slaHours!: number | null;

  @Column({ name: 'elapsed_hours', type: 'int', nullable: true })
  elapsedHours!: number | null;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;
}
