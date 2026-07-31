import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type CommissionContractStatus = 'draft' | 'active' | 'retired' | 'expired' | 'terminated';
export type CommissionBase = 'premium_gross' | 'premium_net';

@Entity('commission_contracts')
@Index(['orgUnitId', 'status', 'effectiveFrom'])
@Index(['status', 'effectiveFrom'])
@Index(['distributionAgreementId'])
export class CommissionContract {
  @PrimaryGeneratedColumn('uuid', { name: 'contract_id' })
  contractId!: string;

  @Column({ name: 'org_unit_id', type: 'uuid' })
  orgUnitId!: string;

  @Column({ name: 'distribution_agreement_id', type: 'uuid', nullable: true })
  distributionAgreementId!: string | null;

  @Column({ name: 'status', type: 'text', default: 'draft' })
  status!: CommissionContractStatus;

  @Column({ name: 'line_of_business', type: 'text', nullable: true })
  lineOfBusiness!: string | null;

  @Column({ name: 'base', type: 'text', default: 'premium_gross' })
  base!: CommissionBase;

  @Column({ name: 'rate_bps', type: 'int', nullable: true })
  rateBps!: number | null;

  @Column({ name: 'fixed_fee_amount', type: 'numeric', nullable: true })
  fixedFeeAmount!: string | null;

  @Column({ name: 'split_percent_bps', type: 'int', nullable: true })
  splitPercentBps!: number | null;

  @Column({ name: 'cap_amount_minor', type: 'numeric', nullable: true })
  capAmountMinor!: string | null;

  @Column({ name: 'floor_amount_minor', type: 'numeric', nullable: true })
  floorAmountMinor!: string | null;

  @Column({ name: 'currency', type: 'text', default: 'IRR' })
  currency!: string;

  @Column({ name: 'effective_from', type: 'timestamptz' })
  effectiveFrom!: Date;

  @Column({ name: 'effective_to', type: 'timestamptz', nullable: true })
  effectiveTo!: Date | null;

  @Column({ name: 'rules', type: 'jsonb', nullable: true })
  rules!: Record<string, any> | null;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
