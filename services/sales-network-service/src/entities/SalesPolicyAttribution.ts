import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('sales_policy_attributions')
@Index(['orgUnitId', 'issuedAt'])
export class SalesPolicyAttribution {
  @PrimaryColumn({ name: 'policy_id', type: 'uuid' })
  policyId!: string;

  @Column({ name: 'org_unit_id', type: 'uuid' })
  orgUnitId!: string;

  @Column({ name: 'policy_number', type: 'text', nullable: true })
  policyNumber!: string | null;

  @Column({ name: 'premium_amount', type: 'numeric', nullable: true })
  premiumAmount!: string | null;

  @Column({ name: 'commission_rate', type: 'numeric', nullable: true })
  commissionRate!: string | null;

  @Column({ name: 'commission_amount', type: 'numeric', nullable: true })
  commissionAmount!: string | null;

  @Column({ name: 'issued_at', type: 'timestamptz' })
  issuedAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
