import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type CertStatus = 'active' | 'expiring' | 'expired' | 'revoked' | 'rotated';

@Entity('partner_certificates')
@Index(['partnerId'])
@Index(['status'])
@Index(['expiresAt'])
export class PartnerCertificate {
  @PrimaryGeneratedColumn('uuid', { name: 'cert_id' })
  certId!: string;

  @Column({ name: 'partner_id', type: 'text' })
  partnerId!: string;

  @Column({ name: 'cert_subject', type: 'text' })
  certSubject!: string;

  @Column({ name: 'cert_serial', type: 'text' })
  certSerial!: string;

  @Column({ name: 'public_cert_pem', type: 'text' })
  publicCertPem!: string;

  @Column({ name: 'issuer', type: 'text' })
  issuer!: string;

  @Column({ name: 'status', type: 'text', default: 'active' })
  status!: CertStatus;

  @Column({ name: 'valid_from', type: 'timestamptz' })
  validFrom!: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'rotated_at', type: 'timestamptz', nullable: true })
  rotatedAt!: Date | null;

  @Column({ name: 'rotated_from_cert_id', type: 'text', nullable: true })
  rotatedFromCertId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
