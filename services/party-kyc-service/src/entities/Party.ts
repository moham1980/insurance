import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type AmlConsentStatus = 'not_required' | 'pending' | 'granted' | 'revoked';

@Entity('parties')
@Index(['tenantId', 'nationalIdBlindIndex'], { unique: true })
@Index(['tenantId', 'type', 'createdAt'])
@Index(['tenantId', 'amlConsentStatus'])
@Index(['tenantId', 'globalUserId'])
export class Party {
  @PrimaryGeneratedColumn('uuid', { name: 'party_id' })
  partyId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ name: 'type', type: 'text' })
  type!: 'individual' | 'company';

  @Column({ name: 'full_name', type: 'text' })
  fullName!: string;

  @Column({ name: 'national_id', type: 'text' })
  nationalId!: string;

  @Column({ name: 'national_id_blind_index', type: 'text' })
  nationalIdBlindIndex!: string;

  @Column({ name: 'mobile', type: 'text', nullable: true })
  mobile!: string | null;

  @Column({ name: 'status', type: 'text', default: 'active' })
  status!: 'active' | 'inactive';

  // AML Consent fields for end-to-end integration
  @Column({ name: 'aml_consent_status', type: 'text', default: 'not_required' })
  amlConsentStatus!: AmlConsentStatus;

  @Column({ name: 'aml_consent_type', type: 'text', nullable: true })
  amlConsentType!: string | null;

  @Column({ name: 'aml_consent_granted_at', type: 'timestamptz', nullable: true })
  amlConsentGrantedAt!: Date | null;

  @Column({ name: 'aml_consent_revoked_at', type: 'timestamptz', nullable: true })
  amlConsentRevokedAt!: Date | null;

  @Column({ name: 'aml_consent_valid_to', type: 'timestamptz', nullable: true })
  amlConsentValidTo!: Date | null;

  @Column({ name: 'global_user_id', type: 'text', nullable: true })
  globalUserId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
