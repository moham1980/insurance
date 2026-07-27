import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type SalesPartnerKind = 'agency' | 'brokerage';
export type SalesPartnerStatus = 'pending' | 'verified' | 'active' | 'suspended' | 'terminated';

@Entity('sales_partners')
@Index(['orgUnitId'], { unique: true })
@Index(['kind', 'status', 'updatedAt'])
export class SalesPartner {
  @PrimaryGeneratedColumn('uuid', { name: 'partner_id' })
  partnerId!: string;

  @Column({ name: 'org_unit_id', type: 'uuid' })
  orgUnitId!: string;

  @Column({ name: 'kind', type: 'text' })
  kind!: SalesPartnerKind;

  @Column({ name: 'status', type: 'text', default: 'pending' })
  status!: SalesPartnerStatus;

  @Column({ name: 'display_name', type: 'text' })
  displayName!: string;

  @Column({ name: 'legal_national_id', type: 'text', nullable: true })
  legalNationalId!: string | null;

  @Column({ name: 'license_code', type: 'text', nullable: true })
  licenseCode!: string | null;

  @Column({ name: 'contact_mobile', type: 'text', nullable: true })
  contactMobile!: string | null;

  @Column({ name: 'contact_email', type: 'text', nullable: true })
  contactEmail!: string | null;

  @Column({ name: 'bank_iban', type: 'text', nullable: true })
  bankIban!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;

  @Column({ name: 'verified_by', type: 'text', nullable: true })
  verifiedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
