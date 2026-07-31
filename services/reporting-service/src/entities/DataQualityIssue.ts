import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('data_quality_issues')
@Index(['tenantId'])
@Index(['ruleId'])
@Index(['entityType'])
@Index(['severity'])
@Index(['status'])
export class DataQualityIssue {
  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string | null;

  @PrimaryGeneratedColumn('uuid', { name: 'issue_id' })
  issueId!: string;

  @Column({ name: 'rule_id', type: 'text' })
  ruleId!: string;

  @Column({ name: 'rule_name', type: 'text' })
  ruleName!: string;

  @Column({ name: 'entity_type', type: 'text' })
  entityType!: string;

  @Column({ name: 'entity_id', type: 'text' })
  entityId!: string;

  @Column({ name: 'severity', type: 'text' })
  severity!: 'low' | 'medium' | 'high' | 'critical';

  @Column({ name: 'status', type: 'text', default: 'open' })
  status!: 'open' | 'resolved' | 'ignored';

  @Column({ name: 'issue_message', type: 'text' })
  issueMessage!: string;

  @Column({ name: 'payload', type: 'jsonb', nullable: true })
  payload!: Record<string, any> | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
