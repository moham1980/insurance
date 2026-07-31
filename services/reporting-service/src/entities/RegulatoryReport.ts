import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('regulatory_reports')
@Index(['tenantId'])
@Index(['reportType'])
@Index(['issuerId'])
@Index(['brokerOrganizationId'])
@Index(['status'])
export class RegulatoryReport {
  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string | null;

  @PrimaryGeneratedColumn('uuid', { name: 'report_id' })
  reportId!: string;

  @Column({ name: 'report_type', type: 'text' })
  reportType!: string;

  @Column({ name: 'issuer_id', type: 'text', nullable: true })
  issuerId!: string | null;

  @Column({ name: 'broker_organization_id', type: 'text', nullable: true })
  brokerOrganizationId!: string | null;

  @Column({ name: 'period_id', type: 'text' })
  periodId!: string;

  @Column({ name: 'period_start_date', type: 'timestamptz', nullable: true })
  periodStartDate!: Date | null;

  @Column({ name: 'period_end_date', type: 'timestamptz', nullable: true })
  periodEndDate!: Date | null;

  @Column({ name: 'status', type: 'text', default: 'draft' })
  status!: string;

  @Column({ name: 'format', type: 'text', default: 'json' })
  format!: string;

  @Column({ name: 'payload', type: 'jsonb', nullable: true })
  payload!: Record<string, any> | null;

  @Column({ name: 'xml_content', type: 'text', nullable: true })
  xmlContent!: string | null;

  @Column({ name: 'generated_by', type: 'uuid', nullable: true })
  generatedBy!: string | null;

  @Column({ name: 'generated_at', type: 'timestamptz', nullable: true })
  generatedAt!: Date | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt!: Date | null;

  @Column({ name: 'signature', type: 'text', nullable: true })
  signature!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
