import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type ConsentStatus = 'pending' | 'granted' | 'denied' | 'expired' | 'revoked';

export type ConsentPurpose =
  | 'underwriting'
  | 'claims_processing'
  | 'fraud_detection'
  | 'marketing'
  | 'analytics'
  | 'regulatory_reporting'
  | 'customer_service'
  | 'third_party_sharing';

@Entity('consent_records')
@Index(['customerId', 'purpose'])
@Index(['status'])
export class ConsentRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'customer_id', type: 'text' })
  customerId!: string;

  @Column({ name: 'tenant_id', type: 'text', nullable: true })
  tenantId?: string | null;

  @Column({ name: 'purpose', type: 'text' })
  purpose!: ConsentPurpose;

  @Column({ name: 'status', type: 'text' })
  status!: ConsentStatus;

  @Column({ name: 'granted_at', type: 'timestamptz', nullable: true })
  grantedAt?: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt?: Date | null;

  @Column({ name: 'consent_text', type: 'text' })
  consentText!: string;

  @Column({ name: 'version', type: 'text' })
  version!: string;

  @Column({ name: 'ip_address', type: 'text', nullable: true })
  ipAddress?: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
