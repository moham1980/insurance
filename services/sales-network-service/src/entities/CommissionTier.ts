import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type CommissionTierType = 'percentage' | 'fixed' | 'tiered';

@Entity('commission_tiers')
@Index(['agreementId'])
export class CommissionTier {
  @PrimaryGeneratedColumn('uuid', { name: 'tier_id' })
  tierId!: string;

  @Column({ name: 'agreement_id', type: 'uuid' })
  agreementId!: string;

  @Column({ name: 'tier_type', type: 'text' })
  tierType!: CommissionTierType;

  @Column({ name: 'line_of_business', type: 'text', nullable: true })
  lineOfBusiness!: string | null;

  @Column({ name: 'min_premium_amount_minor', type: 'numeric', nullable: true })
  minPremiumAmountMinor!: string | null;

  @Column({ name: 'max_premium_amount_minor', type: 'numeric', nullable: true })
  maxPremiumAmountMinor!: string | null;

  @Column({ name: 'rate_bps', type: 'int', nullable: true })
  rateBps!: number | null;

  @Column({ name: 'fixed_amount_minor', type: 'numeric', nullable: true })
  fixedAmountMinor!: string | null;

  @Column({ name: 'cap_amount_minor', type: 'numeric', nullable: true })
  capAmountMinor!: string | null;

  @Column({ name: 'floor_amount_minor', type: 'numeric', nullable: true })
  floorAmountMinor!: string | null;

  @Column({ name: 'split_percent_bps', type: 'int', nullable: true })
  splitPercentBps!: number | null;

  @Column({ name: 'hierarchy_level', type: 'text', nullable: true })
  hierarchyLevel!: string | null;

  @Column({ name: 'currency', type: 'text', default: 'IRR' })
  currency!: string;

  @Column({ name: 'rules', type: 'jsonb', nullable: true })
  rules!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
