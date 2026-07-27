import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('rm_sales_network')
@Index(['partnerId'])
@Index(['orgUnitId'])
@Index(['status'])
@Index(['partnerType'])
@Index(['createdAt'])
export class RmSalesNetwork {
  @Column({ type: 'uuid', name: 'tenant_id', nullable: true })
  tenantId?: string | null;

  @PrimaryGeneratedColumn('uuid', { name: 'partner_id' })
  partnerId!: string;

  @Column({ name: 'org_unit_id', type: 'uuid' })
  orgUnitId!: string;

  @Column({ name: 'partner_name', type: 'text' })
  partnerName!: string;

  @Column({ name: 'partner_type', type: 'text' })
  partnerType!: string;

  @Column({ name: 'status', type: 'text' })
  status!: string;

  @Column({ name: 'registration_number', type: 'text', nullable: true })
  registrationNumber!: string | null;

  @Column({ name: 'contact_email', type: 'text', nullable: true })
  contactEmail!: string | null;

  @Column({ name: 'contact_phone', type: 'text', nullable: true })
  contactPhone!: string | null;

  @Column({ name: 'address_city', type: 'text', nullable: true })
  addressCity!: string | null;

  @Column({ name: 'address_province', type: 'text', nullable: true })
  addressProvince!: string | null;

  @Column({ name: 'commission_rate_bps', type: 'int', nullable: true })
  commissionRateBps!: number | null;

  @Column({ name: 'total_policies_issued', type: 'int', default: 0 })
  totalPoliciesIssued!: number;

  @Column({ name: 'total_premium', type: 'numeric', default: '0' })
  totalPremium!: string;

  @Column({ name: 'total_commission', type: 'numeric', default: '0' })
  totalCommission!: string;

  @Column({ name: 'total_complaints', type: 'int', default: 0 })
  totalComplaints!: number;

  @Column({ name: 'last_policy_issued_at', type: 'timestamptz', nullable: true })
  lastPolicyIssuedAt!: Date | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;

  @Column({ name: 'suspended_at', type: 'timestamptz', nullable: true })
  suspendedAt!: Date | null;

  @Column({ name: 'terminated_at', type: 'timestamptz', nullable: true })
  terminatedAt!: Date | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
