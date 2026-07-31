import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('referral_rules')
@Index(['agreementId'])
export class ReferralRule {
  @PrimaryGeneratedColumn('uuid', { name: 'rule_id' })
  ruleId!: string;

  @Column({ name: 'agreement_id', type: 'uuid' })
  agreementId!: string;

  @Column({ name: 'rule_name', type: 'text' })
  ruleName!: string;

  @Column({ name: 'condition', type: 'jsonb' })
  condition!: Record<string, any>;

  @Column({ name: 'action', type: 'text' })
  action!: string;

  @Column({ name: 'priority', type: 'int', default: 0 })
  priority!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
