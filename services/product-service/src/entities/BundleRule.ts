import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'bundle_rules' })
@Index(['offeringId'])
export class BundleRule {
  @PrimaryColumn('uuid', { name: 'rule_id' })
  ruleId!: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId!: string;

  @Column('uuid', { name: 'offering_id' })
  offeringId!: string;

  @Column({ name: 'product_ids', type: 'uuid', array: true, default: () => "ARRAY[]::uuid[]" })
  productIds!: string[];

  @Column({ name: 'discount_bps', type: 'int', nullable: true })
  discountBps!: number | null;

  @Column({ name: 'reason_code', type: 'varchar', length: 128 })
  reasonCode!: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
