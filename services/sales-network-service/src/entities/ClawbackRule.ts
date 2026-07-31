import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('clawback_rules')
@Index(['agreementId'])
export class ClawbackRule {
  @PrimaryGeneratedColumn('uuid', { name: 'rule_id' })
  ruleId!: string;

  @Column({ name: 'agreement_id', type: 'uuid' })
  agreementId!: string;

  @Column({ name: 'trigger_event', type: 'text' })
  triggerEvent!: string;

  @Column({ name: 'window_days', type: 'int', default: 0 })
  windowDays!: number;

  @Column({ name: 'rate_bps', type: 'int', nullable: true })
  rateBps!: number | null;

  @Column({ name: 'fixed_amount_minor', type: 'numeric', nullable: true })
  fixedAmountMinor!: string | null;

  @Column({ name: 'currency', type: 'text', default: 'IRR' })
  currency!: string;

  @Column({ name: 'rules', type: 'jsonb', nullable: true })
  rules!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
