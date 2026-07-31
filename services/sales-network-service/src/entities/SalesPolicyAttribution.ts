import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('sales_policy_attributions')
@Index(['orgUnitId', 'issuedAt'])
@Index(['organizationId', 'issuedAt'])
@Index(['agentId'])
export class SalesPolicyAttribution {
  @PrimaryColumn({ name: 'policy_id', type: 'uuid' })
  policyId!: string;

  @Column({ name: 'org_unit_id', type: 'uuid' })
  orgUnitId!: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId!: string | null;

  @Column({ name: 'agent_id', type: 'uuid', nullable: true })
  agentId!: string | null;

  @Column({ name: 'policy_number', type: 'text', nullable: true })
  policyNumber!: string | null;

  @Column({ name: 'premium_amount', type: 'numeric', nullable: true })
  premiumAmount!: string | null;

  @Column({ name: 'commission_rate', type: 'numeric', nullable: true })
  commissionRate!: string | null;

  @Column({ name: 'commission_amount', type: 'numeric', nullable: true })
  commissionAmount!: string | null;

  @Column({ name: 'commission_split_amount', type: 'numeric', nullable: true })
  commissionSplitAmount!: string | null;

  @Column({ name: 'distribution_agreement_id', type: 'uuid', nullable: true })
  distributionAgreementId!: string | null;

  @Column({ name: 'line_of_business', type: 'text', nullable: true })
  lineOfBusiness!: string | null;

  @Column({ name: 'policy_status', type: 'text', nullable: true })
  policyStatus!: string | null;

  @Column({ name: 'issued_at', type: 'timestamptz' })
  issuedAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
