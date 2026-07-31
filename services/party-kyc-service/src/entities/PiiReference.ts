import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type PiiReferenceType = 'NATIONAL_ID' | 'MOBILE' | 'EMAIL' | 'IBAN' | 'ACCOUNT_NUMBER' | 'EXTERNAL_SUBJECT';

@Entity('pii_references')
@Index(['piiType', 'blindIndex'])
export class PiiReference {
  @PrimaryGeneratedColumn('uuid', { name: 'pii_reference_id' })
  piiReferenceId!: string;

  @Column({ name: 'pii_type', type: 'text' })
  piiType!: PiiReferenceType;

  @Column({ name: 'ciphertext', type: 'text' })
  ciphertext!: string;

  @Column({ name: 'key_version', type: 'text', default: 'v1' })
  keyVersion!: string;

  @Column({ name: 'blind_index', type: 'text' })
  blindIndex!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ name: 'kms_provider', type: 'text', default: 'local' })
  kmsProvider!: string;

  @Column({ name: 'vault_path', type: 'text', nullable: true })
  vaultPath!: string | null;

  @Column({ name: 'status', type: 'text', default: 'active' })
  status!: 'active' | 'revoked';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
