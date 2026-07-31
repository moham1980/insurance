import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ConsentStatus = 'granted' | 'revoked' | 'expired';
export type ConsentType = 'data_sharing' | 'cross_tenant_access' | 'pii_projection';

@Entity('federation_consents')
@Index(['globalSubjectId', 'targetTenantId', 'consentType'])
@Index(['status'])
export class FederationConsent {
  @PrimaryGeneratedColumn('uuid', { name: 'consent_id' })
  consentId!: string;

  @Column({ name: 'global_subject_id', type: 'uuid' })
  globalSubjectId!: string;

  @Column({ name: 'source_tenant_id', type: 'text' })
  sourceTenantId!: string;

  @Column({ name: 'target_tenant_id', type: 'text' })
  targetTenantId!: string;

  @Column({ name: 'target_organization_id', type: 'text', nullable: true })
  targetOrganizationId!: string | null;

  @Column({ name: 'consent_type', type: 'text' })
  consentType!: ConsentType;

  @Column({ name: 'data_categories', type: 'jsonb', default: [] })
  dataCategories!: string[];

  @Column({ name: 'purpose', type: 'text' })
  purpose!: string;

  @Column({ name: 'status', type: 'text', default: 'granted' })
  status!: ConsentStatus;

  @Column({ name: 'granted_at', type: 'timestamptz' })
  grantedAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({ name: 'revoked_reason', type: 'text', nullable: true })
  revokedReason!: string | null;

  @Column({ name: 'audit_trail', type: 'jsonb', default: [] })
  auditTrail!: Array<{ action: string; at: string; by: string }>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
