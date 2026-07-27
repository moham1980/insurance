import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('rm_underwriting')
@Index(['requestId'])
@Index(['policyId'])
@Index(['status'])
@Index(['riskLevel'])
@Index(['createdAt'])
export class RmUnderwriting {
  @Column({ type: 'uuid', name: 'tenant_id', nullable: true })
  tenantId?: string | null;

  @PrimaryGeneratedColumn('uuid', { name: 'request_id' })
  requestId!: string;

  @Column({ name: 'policy_id', type: 'uuid', nullable: true })
  policyId!: string | null;

  @Column({ name: 'policy_number', type: 'text', nullable: true })
  policyNumber!: string | null;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId!: string | null;

  @Column({ name: 'product_name', type: 'text', nullable: true })
  productName!: string | null;

  @Column({ name: 'line_of_business', type: 'text', nullable: true })
  lineOfBusiness!: string | null;

  @Column({ name: 'status', type: 'text' })
  status!: string;

  @Column({ name: 'risk_level', type: 'text', nullable: true })
  riskLevel!: string | null;

  @Column({ name: 'risk_score', type: 'int', nullable: true })
  riskScore!: number | null;

  @Column({ name: 'decision', type: 'text', nullable: true })
  decision!: string | null;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason!: string | null;

  @Column({ name: 'conditions', type: 'jsonb', nullable: true })
  conditions!: Record<string, any> | null;

  @Column({ name: 'underwriter_id', type: 'uuid', nullable: true })
  underwriterId!: string | null;

  @Column({ name: 'underwriter_name', type: 'text', nullable: true })
  underwriterName!: string | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt!: Date | null;

  @Column({ name: 'assessed_at', type: 'timestamptz', nullable: true })
  assessedAt!: Date | null;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt!: Date | null;

  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  dueDate!: Date | null;

  @Column({ name: 'sla_breached', type: 'boolean', default: false })
  slaBreached!: boolean;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
