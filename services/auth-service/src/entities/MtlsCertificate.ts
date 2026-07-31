import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type CertificateStatus = 'active' | 'revoked' | 'expired';

@Entity('mtls_certificates')
@Index(['organizationId', 'status'])
@Index(['fingerprint'], { unique: true })
export class MtlsCertificate {
  @PrimaryGeneratedColumn('uuid', { name: 'certificate_id' })
  certificateId!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ name: 'common_name', type: 'text' })
  commonName!: string;

  @Column({ name: 'fingerprint', type: 'text' })
  fingerprint!: string;

  @Column({ name: 'pem_content', type: 'text' })
  pemContent!: string;

  @Column({ name: 'issuer', type: 'text', nullable: true })
  issuer!: string | null;

  @Column({ name: 'valid_from', type: 'timestamptz' })
  validFrom!: Date;

  @Column({ name: 'valid_to', type: 'timestamptz' })
  validTo!: Date;

  @Column({ name: 'status', type: 'text', default: 'active' })
  status!: CertificateStatus;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
