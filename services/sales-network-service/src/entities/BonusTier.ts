import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('bonus_tiers')
@Index(['agreementId'])
export class BonusTier {
  @PrimaryGeneratedColumn('uuid', { name: 'bonus_tier_id' })
  bonusTierId!: string;

  @Column({ name: 'agreement_id', type: 'uuid' })
  agreementId!: string;

  @Column({ name: 'name', type: 'text' })
  name!: string;

  @Column({ name: 'metric', type: 'text' })
  metric!: string;

  @Column({ name: 'threshold_amount_minor', type: 'numeric' })
  thresholdAmountMinor!: string;

  @Column({ name: 'threshold_currency', type: 'text' })
  thresholdCurrency!: string;

  @Column({ name: 'bonus_amount_minor', type: 'numeric' })
  bonusAmountMinor!: string;

  @Column({ name: 'bonus_currency', type: 'text' })
  bonusCurrency!: string;

  @Column({ name: 'rules', type: 'jsonb', default: '{}' })
  rules!: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
