import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type RelationshipType = 'carrier_broker' | 'mga_carrier' | 'agency_carrier' | 'referrer' | 'service_provider';
export type OrganizationRelationshipStatus = 'draft' | 'active' | 'suspended' | 'expired' | 'terminated';

@Entity('organization_relationships')
@Index(['tenantId', 'sourceOrganizationId', 'targetOrganizationId', 'relationshipType'])
@Index(['tenantId', 'distributionAgreementId'])
@Index(['status', 'validFrom', 'validTo'])
export class OrganizationRelationship {
  @PrimaryGeneratedColumn('uuid', { name: 'relationship_id' })
  relationshipId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ name: 'source_organization_id', type: 'uuid' })
  sourceOrganizationId!: string;

  @Column({ name: 'target_organization_id', type: 'uuid' })
  targetOrganizationId!: string;

  @Column({ name: 'relationship_type', type: 'text' })
  relationshipType!: RelationshipType;

  @Column({ name: 'distribution_agreement_id', type: 'uuid', nullable: true })
  distributionAgreementId!: string | null;

  @Column({ name: 'commission_rules', type: 'jsonb', nullable: true })
  commissionRules!: {
    defaultRate: number;
    productOverrides?: Array<{ productCode: string; rate: number }>;
    tieredRates?: Array<{ threshold: number; rate: number }>;
  } | null;

  @Column({ name: 'product_scope', type: 'jsonb', nullable: true })
  productScope!: {
    includedProducts?: string[];
    excludedProducts?: string[];
    productCategories?: string[];
  } | null;

  @Column({ name: 'field_acl', type: 'jsonb', nullable: true })
  fieldAcl!: {
    visibleFields?: string[];
    editableFields?: string[];
    hiddenFields?: string[];
  } | null;

  @Column({ name: 'valid_from', type: 'timestamptz' })
  validFrom!: Date;

  @Column({ name: 'valid_to', type: 'timestamptz', nullable: true })
  validTo!: Date | null;

  @Column({ name: 'status', type: 'text', default: 'draft' })
  status!: OrganizationRelationshipStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
