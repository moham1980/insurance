import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from 'typeorm';

@Entity('policies')
@Index(['tenantId', 'policyNumber'], { unique: true })
@Index(['tenantId', 'uniqueCode'], { unique: true, where: '"unique_code" IS NOT NULL' })
@Index(['status', 'updatedAt'])
@Index(['partyId'])
@Index(['tenantId'])
@Index(['idempotencyKey'], { unique: true, where: '"idempotency_key" IS NOT NULL' })
export class Policy {
  @PrimaryGeneratedColumn('uuid', { name: 'policy_id' })
  policyId!: string;

  @Column({ name: 'tenant_id', type: 'text', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'policy_number', type: 'text' })
  policyNumber!: string;

  // Senhab Unique Code (کد یکتا) - without this, policy may be considered invalid by regulator.
  @Column({ name: 'unique_code', type: 'text', nullable: true })
  uniqueCode!: string | null;

  // Sanhab submission lifecycle (P6-1)
  @Column({ name: 'sanhab_status', type: 'text', default: 'not_submitted' })
  sanhabStatus!: 'not_submitted' | 'pending' | 'confirmed' | 'rejected';

  @Column({ name: 'sanhab_submission_id', type: 'text', nullable: true })
  sanhabSubmissionId!: string | null;

  @Column({ name: 'sanhab_response', type: 'jsonb', nullable: true })
  sanhabResponse!: Record<string, any> | null;

  @Column({ name: 'status', type: 'text', default: 'inquiry' })
  status!:
    | 'inquiry'
    | 'bound'
    | 'docs_pending'
    | 'uw_pending'
    | 'uw_rejected'
    | 'risk_assessed'
    | 'issued'
    | 'active'
    | 'endorsed'
    | 'cancelled'
    | 'renewed'
    | 'lapsed';

  // Party reference from Party/KYC service
  @Column({ name: 'party_id', type: 'uuid' })
  partyId!: string;

  // Sales network attribution (agency/brokerage orgUnitId) for commission/KPI.
  @Column({ name: 'producer_org_unit_id', type: 'uuid', nullable: true })
  producerOrgUnitId!: string | null;

  // P0 broker license and distribution organization references
  @Column({ name: 'broker_license_id', type: 'uuid', nullable: true })
  brokerLicenseId!: string | null;

  @Column({ name: 'distribution_organization_id', type: 'uuid', nullable: true })
  distributionOrganizationId!: string | null;

  @Column({ name: 'issuer_organization_id', type: 'uuid', nullable: true })
  issuerOrganizationId!: string | null;

  @Column({ name: 'record_owner_organization_id', type: 'uuid', nullable: true })
  recordOwnerOrganizationId!: string | null;

  @Column({ name: 'authoritative_tenant_id', type: 'text', nullable: true })
  authoritativeTenantId!: string | null;

  @Column({ name: 'sales_channel_type', type: 'text', default: 'DIRECT' })
  salesChannelType!:
    | 'DIRECT'
    | 'BROKER'
    | 'AGENT'
    | 'MGA'
    | 'BANCASSURANCE'
    | 'ONLINE'
    | 'OFFLINE';

  @Column({ name: 'source_system_id', type: 'text', nullable: true })
  sourceSystemId!: string | null;

  @Column({ name: 'external_policy_id', type: 'text', nullable: true })
  externalPolicyId!: string | null;

  @Column({ name: 'submission_id', type: 'uuid', nullable: true })
  submissionId!: string | null;

  @Column({ name: 'placement_id', type: 'uuid', nullable: true })
  placementId!: string | null;

  @Column({ name: 'customer_party_id', type: 'uuid', nullable: true })
  customerPartyId!: string | null;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId!: string | null;

  @Column({ name: 'product_version', type: 'int', default: 1 })
  productVersion!: number;

  @Column({ name: 'sub_agent_party_id', type: 'uuid', nullable: true })
  subAgentPartyId!: string | null;

  @Column({ name: 'marketer_party_id', type: 'uuid', nullable: true })
  marketerPartyId!: string | null;

  @Column({ name: 'producer_party_id', type: 'uuid', nullable: true })
  producerPartyId!: string | null;

  @Column({ name: 'servicing_organization_id', type: 'uuid', nullable: true })
  servicingOrganizationId!: string | null;

  @Column({ name: 'line_of_business', type: 'text' })
  lineOfBusiness!: string;

  @Column({ name: 'start_date', type: 'timestamptz' })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'timestamptz' })
  endDate!: Date;

  @Column({ name: 'premium_amount', type: 'numeric' })
  premiumAmount!: number;

  @Column({ name: 'premium_currency', type: 'text', default: 'IRR' })
  premiumCurrency!: string;

  @Column({ name: 'taxes_amount', type: 'numeric', default: 0 })
  taxesAmount!: number;

  @Column({ name: 'taxes_currency', type: 'text', default: 'IRR' })
  taxesCurrency!: string;

  @Column({ name: 'total_payable_amount', type: 'numeric', default: 0 })
  totalPayableAmount!: number;

  @Column({ name: 'total_payable_currency', type: 'text', default: 'IRR' })
  totalPayableCurrency!: string;

  @Column({ name: 'fees', type: 'jsonb', nullable: true })
  fees!: Array<{ code: string; amount: number; currency: string }> | null;

  @Column({ name: 'policy_terms', type: 'jsonb', nullable: true })
  policyTerms!: Record<string, any> | null;

  @Column({ name: 'commission_split_snapshot', type: 'jsonb', nullable: true })
  commissionSplitSnapshot!: Record<string, any> | null;

  @Column({ name: 'coverages', type: 'jsonb', nullable: true })
  coverages!: Record<string, any> | null;

  @Column({ name: 'deductibles', type: 'jsonb', nullable: true })
  deductibles!: Record<string, any> | null;

  @Column({ name: 'installments', type: 'jsonb', nullable: true })
  installments!: Array<Record<string, any>> | null;

  // Holds data gathered in stage 2 (جمع‌آوری اطلاعات و مدارک)
  @Column({ name: 'application_data', type: 'jsonb', nullable: true })
  applicationData!: Record<string, any> | null;

  // Holds output of stage 3 (ارزیابی ریسک)
  @Column({ name: 'risk_assessment', type: 'jsonb', nullable: true })
  riskAssessment!: Record<string, any> | null;

  // Auto-renewal fields
  @Column({ name: 'auto_renew', type: 'boolean', default: false })
  autoRenew!: boolean;

  @Column({ name: 'renewal_count', type: 'int', default: 0 })
  renewalCount!: number;

  @Column({ name: 'max_renewals', type: 'int', default: 10 })
  maxRenewals!: number;

  @Column({ name: 'renewal_parent_id', type: 'uuid', nullable: true })
  renewalParentId!: string | null;

  @Column({ name: 'renewal_reminder_sent_at', type: 'timestamptz', nullable: true })
  renewalReminderSentAt!: Date | null;

  @Column({ name: 'renewal_notified_at', type: 'timestamptz', nullable: true })
  renewalNotifiedAt!: Date | null;

  // Archival fields for data retention
  @Column({ name: 'archived', type: 'boolean', default: false })
  archived!: boolean;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt!: Date | null;

  @Column({ name: 'idempotency_key', type: 'text', nullable: true })
  idempotencyKey!: string | null;

  @VersionColumn({ name: 'version', type: 'int', default: 0 })
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
