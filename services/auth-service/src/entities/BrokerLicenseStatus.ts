import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type LicenseStatus = 'active' | 'suspended' | 'revoked' | 'expired' | 'pending';
export type LicenseType = 'life' | 'non_life' | 'both';

@Entity('broker_license_statuses')
@Index(['organizationId'], { unique: true })
@Index(['brokerCentralCode'], { unique: true })
@Index(['status'])
export class BrokerLicenseStatus {
  @PrimaryGeneratedColumn('uuid', { name: 'license_status_id' })
  licenseStatusId!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ name: 'broker_central_code', type: 'text' })
  brokerCentralCode!: string;

  @Column({ name: 'license_number', type: 'text' })
  licenseNumber!: string;

  @Column({ name: 'license_type', type: 'text' })
  licenseType!: LicenseType;

  @Column({ name: 'status', type: 'text', default: 'pending' })
  status!: LicenseStatus;

  @Column({ name: 'expiry_date', type: 'timestamptz', nullable: true })
  expiryDate!: Date | null;

  @Column({ name: 'scope', type: 'text', array: true, default: () => "ARRAY[]::text[]" })
  scope!: string[];

  @Column({ name: 'last_verified_at', type: 'timestamptz' })
  lastVerifiedAt!: Date;

  @Column({ name: 'last_verification_source', type: 'text' })
  lastVerificationSource!: string;

  @Column({ name: 'suspension_reason', type: 'text', nullable: true })
  suspensionReason!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
