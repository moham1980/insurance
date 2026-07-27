import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

export type PricingRuleStatus = 'draft' | 'active' | 'archived';
export type PricingRuleType = 'base' | 'conditional' | 'tiered' | 'regional' | 'discount' | 'surcharge';

@Entity({ name: 'pricing_rules' })
@Index(['tenantId'])
@Index(['productId'])
@Index(['tenantId', 'productId', 'code'], { unique: true })
@Index(['ruleType', 'status'])
export class PricingRule {
  @PrimaryColumn('uuid', { name: 'pricing_rule_id' })
  pricingRuleId!: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId!: string;

  @Column('uuid', { name: 'product_id' })
  productId!: string;

  @Column({ name: 'code', type: 'varchar', length: 64 })
  code!: string;

  @Column({ name: 'name_fa', type: 'varchar', length: 256 })
  nameFa!: string;

  @Column({ name: 'status', type: 'varchar', length: 32 })
  status!: PricingRuleStatus;

  @Column({ name: 'rule_type', type: 'varchar', length: 32, default: 'base' })
  ruleType!: PricingRuleType;

  @Column({ name: 'priority', type: 'int', default: 0 })
  priority!: number;

  @Column({ name: 'conditions', type: 'jsonb', nullable: true })
  conditions!: Record<string, any> | null;

  @Column({ name: 'rule', type: 'jsonb' })
  rule!: any;

  @Column({ name: 'valid_from', type: 'timestamptz', nullable: true })
  validFrom!: Date | null;

  @Column({ name: 'valid_to', type: 'timestamptz', nullable: true })
  validTo!: Date | null;

  @Column({ name: 'regions', type: 'jsonb', nullable: true })
  regions!: string[] | null;

  @Column({ name: 'created_by', type: 'varchar', length: 128, nullable: true })
  createdBy!: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
