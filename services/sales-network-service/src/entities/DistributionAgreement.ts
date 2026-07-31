import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type DistributionAgreementType = 'brokerage' | 'agency' | 'mga' | 'referral';
export type DistributionAgreementStatus = 'draft' | 'pending_approval' | 'active' | 'terminated' | 'expired';

@Entity('distribution_agreements')
@Index(['carrierOrganizationId', 'distributorOrganizationId', 'status'])
@Index(['tenantId', 'status'])
@Index(['status', 'effectiveFrom', 'effectiveTo'])
export class DistributionAgreement {
  @PrimaryGeneratedColumn('uuid', { name: 'agreement_id' })
  agreementId!: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId!: string;

  @Column({ name: 'carrier_organization_id', type: 'uuid' })
  carrierOrganizationId!: string;

  @Column({ name: 'distributor_organization_id', type: 'uuid' })
  distributorOrganizationId!: string;

  @Column({ name: 'agreement_type', type: 'text' })
  agreementType!: DistributionAgreementType;

  @Column({ name: 'version', type: 'int', default: 1 })
  version!: number;

  @Column({ name: 'effective_from', type: 'timestamptz' })
  effectiveFrom!: Date;

  @Column({ name: 'effective_to', type: 'timestamptz', nullable: true })
  effectiveTo!: Date | null;

  @Column({ name: 'status', type: 'text', default: 'draft' })
  status!: DistributionAgreementStatus;

  @Column({ name: 'lines_of_business', type: 'text', array: true, default: () => "ARRAY[]::text[]" })
  linesOfBusiness!: string[];

  @Column({ name: 'product_scope', type: 'text', array: true, default: () => "ARRAY[]::text[]" })
  productScope!: string[];

  @Column({ name: 'territories', type: 'text', array: true, default: () => "ARRAY[]::text[]" })
  territories!: string[];

  @Column({ name: 'binding_authority_amount_minor', type: 'numeric' })
  bindingAuthorityAmountMinor!: string;

  @Column({ name: 'binding_authority_currency', type: 'text' })
  bindingAuthorityCurrency!: string;

  @Column({ name: 'settlement_terms', type: 'jsonb', default: '{}' })
  settlementTerms!: Record<string, any>;

  @Column({ name: 'document_refs', type: 'text', array: true, default: () => "ARRAY[]::text[]" })
  documentRefs!: string[];

  @Column({ name: 'approval_workflow_id', type: 'text', nullable: true })
  approvalWorkflowId!: string | null;

  @Column('uuid', { name: 'binding_authority_profile_id', nullable: true })
  bindingAuthorityProfileId!: string | null;

  @Column('uuid', { name: 'version_chain_id', nullable: true })
  versionChainId!: string | null;

  @Column('uuid', { name: 'previous_agreement_id', nullable: true })
  previousAgreementId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
