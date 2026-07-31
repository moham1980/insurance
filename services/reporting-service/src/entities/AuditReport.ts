import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('audit_reports')
@Index(['tenantId'])
@Index(['reportType'])
@Index(['status'])
export class AuditReport {
  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string | null;

  @PrimaryGeneratedColumn('uuid', { name: 'report_id' })
  reportId!: string;

  @Column({ name: 'report_type', type: 'text' })
  reportType!: string;

  @Column({ name: 'period_id', type: 'text', nullable: true })
  periodId!: string | null;

  @Column({ name: 'period_start_date', type: 'timestamptz', nullable: true })
  periodStartDate!: Date | null;

  @Column({ name: 'period_end_date', type: 'timestamptz', nullable: true })
  periodEndDate!: Date | null;

  @Column({ name: 'status', type: 'text', default: 'draft' })
  status!: string;

  @Column({ name: 'generated_by', type: 'uuid', nullable: true })
  generatedBy!: string | null;

  @Column({ name: 'generated_at', type: 'timestamptz', nullable: true })
  generatedAt!: Date | null;

  @Column({ name: 'payload', type: 'jsonb', nullable: true })
  payload!: Record<string, any> | null;

  @Column({ name: 'signature', type: 'text', nullable: true })
  signature!: string | null;

  @Column({ name: 'previous_signature', type: 'text', nullable: true })
  previousSignature!: string | null;

  @Column({ name: 'export_masked', type: 'boolean', default: false })
  exportMasked!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
