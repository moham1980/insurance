import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type AmlRuleStatus = 'enabled' | 'disabled';

@Entity('aml_rules')
@Index(['status', 'createdAt'])
@Index(['ruleType'])
export class AmlRule {
  @PrimaryGeneratedColumn('uuid', { name: 'rule_id' })
  ruleId!: string;

  @Column({ name: 'rule_name', type: 'text' })
  ruleName!: string;

  @Column({ name: 'rule_type', type: 'text' })
  ruleType!: string;

  @Column({ name: 'status', type: 'text', default: 'enabled' })
  status!: AmlRuleStatus;

  @Column({ name: 'severity', type: 'text', default: 'medium' })
  severity!: 'low' | 'medium' | 'high' | 'critical';

  @Column({ name: 'expression', type: 'text' })
  expression!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
