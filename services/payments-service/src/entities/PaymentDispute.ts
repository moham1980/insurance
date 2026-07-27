import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('payment_disputes')
@Index(['tenantId'])
@Index(['paymentId'])
export class PaymentDispute {
  @PrimaryGeneratedColumn('uuid', { name: 'dispute_id' })
  disputeId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ name: 'payment_id', type: 'uuid' })
  paymentId!: string;

  @Column({ name: 'reason', type: 'text' })
  reason!: string;

  @Column({ name: 'evidence', type: 'jsonb', nullable: true })
  evidence!: Record<string, any> | null;

  @Column({ name: 'status', type: 'text', default: 'open' })
  status!: 'open' | 'under_review' | 'resolved' | 'rejected';

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes!: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
