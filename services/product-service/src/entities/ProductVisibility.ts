import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

export type ProductVisibilityType = 'private' | 'exclusive' | 'marketplace';
export type ProductVisibilityStatus = 'draft' | 'active' | 'revoked';

@Entity({ name: 'product_visibilities' })
@Index(['tenantId'])
@Index(['productId'])
@Index(['distributorOrganizationId'])
@Index(['tenantId', 'productId', 'distributorOrganizationId'])
export class ProductVisibility {
  @PrimaryColumn('uuid', { name: 'visibility_id' })
  visibilityId!: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId!: string;

  @Column('uuid', { name: 'product_id' })
  productId!: string;

  @Column({ name: 'product_version', type: 'int' })
  productVersion!: number;

  @Column({ name: 'distributor_organization_id', type: 'uuid', nullable: true })
  distributorOrganizationId!: string | null;

  @Column({ name: 'visibility_type', type: 'varchar', length: 32 })
  visibilityType!: ProductVisibilityType;

  @Column('uuid', { name: 'distribution_agreement_id' })
  distributionAgreementId!: string;

  @Column({ name: 'agreement_version_at_creation', type: 'int' })
  agreementVersionAtCreation!: number;

  @Column({ name: 'markup_rules', type: 'jsonb', nullable: true })
  markupRules!: Record<string, any>[] | null;

  @Column({ name: 'allowed_territories', type: 'text', array: true, default: () => "ARRAY[]::text[]" })
  allowedTerritories!: string[];

  @Column({ name: 'allowed_sales_channels', type: 'text', array: true, default: () => "ARRAY[]::text[]" })
  allowedSalesChannels!: string[];

  @Column({ name: 'status', type: 'varchar', length: 32 })
  status!: ProductVisibilityStatus;

  @Column({ name: 'effective_from', type: 'timestamptz' })
  effectiveFrom!: Date;

  @Column({ name: 'effective_to', type: 'timestamptz', nullable: true })
  effectiveTo!: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
