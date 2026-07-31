import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type BrokerLicenseType = 'life' | 'non_life' | 'both';
export type BrokerLicenseStatus = 'active' | 'suspended' | 'revoked' | 'expired';

@Entity('broker_licenses')
@Index(['tenantId', 'partyId', 'organizationId'])
@Index(['tenantId', 'brokerCentralCode'], { unique: true })
@Index(['tenantId', 'licenseNumber'], { unique: true })
export class BrokerLicense {
  @PrimaryGeneratedColumn('uuid', { name: 'license_id' })
  licenseId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ name: 'party_id', type: 'uuid' })
  partyId!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'broker_central_code', type: 'text' })
  brokerCentralCode!: string;

  @Column({ name: 'license_number', type: 'text' })
  licenseNumber!: string;

  @Column({ name: 'license_type', type: 'text' })
  licenseType!: BrokerLicenseType;

  @Column({ name: 'scope', type: 'text', array: true, default: () => "ARRAY[]::text[]" })
  scope!: string[];

  @Column({ name: 'issue_date', type: 'timestamptz' })
  issueDate!: Date;

  @Column({ name: 'expiry_date', type: 'timestamptz' })
  expiryDate!: Date;

  @Column({ name: 'status', type: 'text', default: 'active' })
  status!: BrokerLicenseStatus;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;

  @Column({ name: 'verified_by', type: 'text', nullable: true })
  verifiedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
