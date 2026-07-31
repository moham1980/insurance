import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type AdjusterReferralStatus = 'pending' | 'accepted' | 'rejected' | 'assigned' | 'report_received' | 'closed';

@Entity('adjuster_referrals')
@Index(['claimId'])
@Index(['caseId'])
@Index(['adjusterOrganizationId'])
@Index(['adjusterPartyId'])
@Index(['tenantId'])
export class AdjusterReferral {
  @PrimaryGeneratedColumn('uuid', { name: 'referral_id' })
  referralId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'claim_id', type: 'uuid' })
  claimId: string;

  @Column({ name: 'case_id', type: 'uuid' })
  caseId: string;

  @Column({ name: 'adjuster_organization_id', type: 'uuid' })
  adjusterOrganizationId: string;

  @Column({ name: 'adjuster_party_id', type: 'uuid' })
  adjusterPartyId: string;

  @Column({ name: 'referral_date', type: 'timestamptz' })
  referralDate: Date;

  @Column({ name: 'status', type: 'text', default: 'pending' })
  status: AdjusterReferralStatus;

  @Column({ name: 'estimated_fee_amount', type: 'numeric', nullable: true })
  estimatedFeeAmount: number | null;

  @Column({ name: 'estimated_fee_currency', type: 'text', default: 'IRR' })
  estimatedFeeCurrency: string;

  @Column({ name: 'report_ref', type: 'text', nullable: true })
  reportRef: string | null;

  @Column({ name: 'report_checksum', type: 'text', nullable: true })
  reportChecksum: string | null;

  @Column({ name: 'report_received_at', type: 'timestamptz', nullable: true })
  reportReceivedAt: Date | null;

  @Column({ name: 'report_metadata', type: 'jsonb', nullable: true })
  reportMetadata: Record<string, any> | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
