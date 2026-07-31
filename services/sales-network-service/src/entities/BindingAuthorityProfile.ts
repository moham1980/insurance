import { Column, Entity, Index, PrimaryColumn, UpdateDateColumn, CreateDateColumn } from 'typeorm';

export type BindingAuthorityProfileStatus = 'draft' | 'active' | 'expired';

@Entity({ name: 'binding_authority_profiles' })
@Index(['tenantId'])
@Index(['carrierOrganizationId'])
@Index(['tenantId', 'carrierOrganizationId', 'lineOfBusiness'])
export class BindingAuthorityProfile {
  @PrimaryColumn('uuid', { name: 'profile_id' })
  profileId!: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId!: string;

  @Column('uuid', { name: 'carrier_organization_id' })
  carrierOrganizationId!: string;

  @Column({ name: 'line_of_business', type: 'text' })
  lineOfBusiness!: string;

  @Column({ name: 'per_risk_amount_minor', type: 'numeric' })
  perRiskAmountMinor!: string;

  @Column({ name: 'per_occurrence_amount_minor', type: 'numeric' })
  perOccurrenceAmountMinor!: string;

  @Column({ name: 'aggregate_amount_minor', type: 'numeric' })
  aggregateAmountMinor!: string;

  @Column({ name: 'currency', type: 'text' })
  currency!: string;

  @Column({ name: 'auto_bind', type: 'boolean', default: false })
  autoBind!: boolean;

  @Column({ name: 'referral_threshold_amount_minor', type: 'numeric', nullable: true })
  referralThresholdAmountMinor!: string | null;

  @Column({ name: 'referral_threshold_currency', type: 'text', nullable: true })
  referralThresholdCurrency!: string | null;

  @Column({ name: 'effective_from', type: 'timestamptz' })
  effectiveFrom!: Date;

  @Column({ name: 'effective_to', type: 'timestamptz', nullable: true })
  effectiveTo!: Date | null;

  @Column({ name: 'status', type: 'text', default: 'draft' })
  status!: BindingAuthorityProfileStatus;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
