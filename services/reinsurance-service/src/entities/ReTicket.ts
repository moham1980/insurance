import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ReTicketStatus = 'open' | 'in_review' | 'resolved' | 'rejected';

@Entity('re_tickets')
@Index(['tenantId', 'reconciliationId', 'createdAt'])
@Index(['tenantId', 'status', 'createdAt'])
@Index(['tenantId', 'assignedTo'])
export class ReTicket {
  @PrimaryGeneratedColumn('uuid', { name: 'ticket_id' })
  ticketId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ name: 'reconciliation_id', type: 'uuid' })
  reconciliationId!: string;

  @Column({ name: 'reason_code', type: 'text' })
  reasonCode!: string;

  @Column({ name: 'status', type: 'text', default: 'open' })
  status!: ReTicketStatus;

  @Column({ name: 'sla_response_due_at', type: 'timestamptz', nullable: true })
  slaResponseDueAt!: Date | null;

  @Column({ name: 'assigned_to', type: 'text', nullable: true })
  assignedTo!: string | null;

  @Column({ name: 'summary', type: 'text', nullable: true })
  summary!: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
