import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('consent_records')
export class ConsentRecordEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'consent_id' })
  consentId!: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 255 })
  @Index('idx_consent_customer_id')
  customerId!: string;

  @Column({ name: 'purpose', type: 'varchar', length: 100 })
  purpose!: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'granted' })
  status!: 'granted' | 'denied' | 'revoked' | 'expired';

  @Column({ name: 'granted_at', type: 'timestamptz', nullable: true })
  grantedAt?: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt?: Date;

  @Column({ name: 'revocation_reason', type: 'text', nullable: true })
  revocationReason?: string;

  @Column({ name: 'version', type: 'varchar', length: 20, default: '1.0' })
  version!: string;

  @Column({ name: 'source', type: 'varchar', length: 100, nullable: true })
  source?: string;

  @Column({ name: 'channel', type: 'varchar', length: 50, nullable: true })
  channel?: string;

  @Column({ name: 'actor_user_id', type: 'varchar', length: 255, nullable: true })
  actorUserId?: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 255, nullable: true })
  @Index('idx_consent_tenant')
  tenantId?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
