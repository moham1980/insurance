import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('document_trust_chain')
@Index(['tenantId', 'partyId', 'chainPosition'], { unique: true })
export class DocumentTrustChainEntry {
  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ type: 'uuid', name: 'party_id' })
  partyId!: string;

  @Column({ name: 'document_id' })
  documentId!: string;

  @Column({ name: 'document_type' })
  documentType!: string;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt!: Date;

  @Column({ name: 'uploaded_by' })
  uploadedBy!: string;

  @Column({ type: 'boolean', default: false })
  verified!: boolean;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;

  @Column({ name: 'verified_by', type: 'varchar', nullable: true })
  verifiedBy!: string | null;

  @Column({ name: 'verification_method' })
  verificationMethod!: string;

  @Column({ name: 'trust_level', type: 'varchar', default: 'low' })
  trustLevel!: 'low' | 'medium' | 'high';

  @Column()
  hash!: string;

  @Column({ name: 'previous_hash', type: 'varchar', nullable: true })
  previousHash!: string | null;

  @Column({ name: 'chain_position', type: 'int' })
  chainPosition!: number;

  @PrimaryColumn({ type: 'uuid', name: 'entry_id' })
  entryId!: string;
}
