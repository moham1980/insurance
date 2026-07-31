import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

export type BrokerProductOfferingStatus = 'active' | 'inactive';

@Entity({ name: 'broker_product_offerings' })
@Index(['tenantId'])
@Index(['brokerOrganizationId'])
@Index(['brokerOrganizationId', 'status'])
export class BrokerProductOffering {
  @PrimaryColumn('uuid', { name: 'offering_id' })
  offeringId!: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId!: string;

  @Column('uuid', { name: 'broker_tenant_id' })
  brokerTenantId!: string;

  @Column('uuid', { name: 'broker_organization_id' })
  brokerOrganizationId!: string;

  @Column({ name: 'name', type: 'varchar', length: 256 })
  name!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'included_product_ids', type: 'uuid', array: true, default: () => "ARRAY[]::uuid[]" })
  includedProductIds!: string[];

  @Column({ name: 'markup_rules', type: 'jsonb', nullable: true })
  markupRules!: Record<string, any>[] | null;

  @Column({ name: 'commission_tiers', type: 'jsonb', nullable: true })
  commissionTiers!: Array<{
    name: string;
    criteria: Record<string, any>;
    rateBps: number;
    reasonCode?: string;
  }> | null;

  @Column({ name: 'allowed_sales_channels', type: 'text', array: true, default: () => "ARRAY[]::text[]" })
  allowedSalesChannels!: string[];

  @Column({ name: 'effective_from', type: 'timestamptz' })
  effectiveFrom!: Date;

  @Column({ name: 'effective_to', type: 'timestamptz', nullable: true })
  effectiveTo!: Date | null;

  @Column({ name: 'status', type: 'varchar', length: 32 })
  status!: BrokerProductOfferingStatus;

  @Column({ name: 'agreement_version_snapshot', type: 'int' })
  agreementVersionSnapshot!: number;

  @Column('uuid', { name: 'distribution_agreement_id' })
  distributionAgreementId!: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
