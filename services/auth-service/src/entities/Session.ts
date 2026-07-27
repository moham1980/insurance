import { Entity, PrimaryColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('sessions')
export class Session {
  @PrimaryColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'user_id' })
  userId: string;

  @Index()
  @Column('uuid', { name: 'tenant_id', nullable: true })
  tenantId: string | null;

  @Column('varchar', { name: 'device_fingerprint', length: 64 })
  deviceFingerprint: string;

  @Column('varchar', { name: 'ip_address', length: 255, nullable: true })
  ipAddress: string | null;

  @Column('text', { name: 'user_agent', nullable: true })
  userAgent: string | null;

  @Column('varchar', { name: 'refresh_token_hash', length: 512, nullable: true })
  refreshTokenHash: string | null;

  @Column('timestamp', { name: 'refresh_token_expires_at', nullable: true })
  refreshTokenExpiresAt: Date | null;

  @Column('timestamp', { name: 'last_activity_at', nullable: true })
  lastActivityAt: Date | null;

  @Column('boolean', { name: 'is_revoked', default: false })
  isRevoked: boolean;

  @Column('varchar', { name: 'status', length: 50, default: 'active' })
  status: 'active' | 'expired' | 'revoked';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
