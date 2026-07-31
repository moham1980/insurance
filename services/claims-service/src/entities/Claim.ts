import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn, VersionColumn } from 'typeorm';

export type ClaimStatus =
  | 'reported'
  | 'registered'
  | 'acknowledged'
  | 'under_review'
  | 'adjuster_assigned'
  | 'assessed'
  | 'approved'
  | 'rejected'
  | 'denied'
  | 'paid'
  | 'settled'
  | 'closed'
  | 'appealed';

export type ClaimNotificationChannel = 'web' | 'mobile_app' | 'sms' | 'email' | 'call_center';

@Entity('claims')
@Index(['claimNumber'], { unique: true })
@Index(['policyId'])
@Index(['status', 'updatedAt'])
@Index(['tenantId'])
@Index(['carrierOrganizationId'])
@Index(['distributionOrganizationId'])
@Index(['brokerOrganizationId'])
@Index(['claimantPartyId'])
@Index(['recordOwnerOrganizationId'])
export class Claim {
  @PrimaryGeneratedColumn('uuid', { name: 'claim_id' })
  claimId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'authoritative_tenant_id', type: 'uuid' })
  authoritativeTenantId: string;

  @Column({ name: 'record_owner_organization_id', type: 'uuid' })
  recordOwnerOrganizationId: string;

  @Column({ name: 'carrier_organization_id', type: 'uuid' })
  carrierOrganizationId: string;

  @Column({ name: 'distribution_organization_id', type: 'uuid', nullable: true })
  distributionOrganizationId: string | null;

  @Column({ name: 'broker_organization_id', type: 'uuid', nullable: true })
  brokerOrganizationId: string | null;

  @Column({ name: 'claim_number', type: 'text', unique: true })
  claimNumber: string;

  @VersionColumn({ name: 'version', type: 'int', default: 0 })
  version: number;

  @Column({ name: 'policy_id', type: 'uuid' })
  policyId: string;

  @Column({ name: 'policy_number', type: 'text', nullable: true })
  policyNumber: string | null;

  @Column({ name: 'external_claim_id', type: 'text', nullable: true })
  externalClaimId: string | null;

  @Column({ name: 'claimant_party_id', type: 'uuid' })
  claimantPartyId: string;

  @Column({ name: 'representative_party_id', type: 'uuid', nullable: true })
  representativePartyId: string | null;

  @Column({ name: 'claim_type', type: 'text', default: 'first_party' })
  claimType: string;

  @Column({ name: 'loss_date', type: 'timestamptz' })
  lossDate: Date;

  @Column({ name: 'loss_type', type: 'text' })
  lossType: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'reported_date', type: 'timestamptz', default: () => 'NOW()' })
  reportedDate: Date;

  @Column({ name: 'status', type: 'text', default: 'registered' })
  status: ClaimStatus;

  @Column({ name: 'assessed_amount', type: 'numeric', nullable: true })
  assessedAmount: number | null;

  @Column({ name: 'approved_amount', type: 'numeric', nullable: true })
  approvedAmount: number | null;

  @Column({ name: 'paid_amount', type: 'numeric', nullable: true })
  paidAmount: number | null;

  @Column({ name: 'reserve_amount', type: 'numeric', nullable: true })
  reserveAmount: number | null;

  @Column({ name: 'settlement_amount', type: 'numeric', nullable: true })
  settlementAmount: number | null;

  // Deductible and franchise fields
  @Column({ name: 'deductible_amount', type: 'numeric', nullable: true })
  deductibleAmount: number | null;

  @Column({ name: 'deductible_percentage', type: 'numeric', nullable: true })
  deductiblePercentage: number | null;

  @Column({ name: 'franchise_amount', type: 'numeric', nullable: true })
  franchiseAmount: number | null;

  @Column({ name: 'franchise_percentage', type: 'numeric', nullable: true })
  franchisePercentage: number | null;

  @Column({ name: 'gross_claim_amount', type: 'numeric', nullable: true })
  grossClaimAmount: number | null;

  @Column({ name: 'requires_human_triage', type: 'boolean', default: true })
  requiresHumanTriage: boolean;

  // FNOL-specific fields
  @Column({ name: 'notification_channel', type: 'text', nullable: true })
  notificationChannel: 'web' | 'mobile_app' | 'sms' | 'email' | 'call_center' | null;

  @Column({ name: 'notification_source', type: 'text', nullable: true })
  notificationSource: string | null;

  @Column({ name: 'auto_assigned_adjuster_id', type: 'uuid', nullable: true })
  autoAssignedAdjusterId: string | null;

  @Column({ name: 'auto_triage_score', type: 'int', nullable: true })
  autoTriageScore: number | null;

  @Column({ name: 'auto_triage_category', type: 'text', nullable: true })
  autoTriageCategory: 'low' | 'medium' | 'high' | null;

  @Column({ name: 'policy_validated', type: 'boolean', default: false })
  policyValidated: boolean;

  @Column({ name: 'policy_validation_result', type: 'jsonb', nullable: true })
  policyValidationResult: Record<string, any> | null;

  @Column({ name: 'contact_phone', type: 'text', nullable: true })
  contactPhone: string | null;

  @Column({ name: 'contact_email', type: 'text', nullable: true })
  contactEmail: string | null;

  @Column({ name: 'location_address', type: 'text', nullable: true })
  locationAddress: string | null;

  @Column({ name: 'location_city', type: 'text', nullable: true })
  locationCity: string | null;

  @Column({ name: 'location_province', type: 'text', nullable: true })
  locationProvince: string | null;

  @Column({ name: 'witnesses', type: 'jsonb', nullable: true })
  witnesses: Record<string, any>[] | null;

  @Column({ name: 'attached_documents', type: 'jsonb', nullable: true })
  attachedDocuments: Record<string, any>[] | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ name: 'idempotency_key', type: 'text', nullable: true })
  idempotencyKey: string | null;

  @Column({ name: 'idempotency_payload_hash', type: 'text', nullable: true })
  idempotencyPayloadHash: string | null;

  @Column({ name: 'currency', type: 'text', default: 'IRR' })
  currency: string;

  @Column({ name: 'payment_reference', type: 'text', nullable: true })
  paymentReference: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
