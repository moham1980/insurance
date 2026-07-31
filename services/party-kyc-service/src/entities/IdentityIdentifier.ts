import { Column, CreateDateColumn, Entity, Index, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { PiiReference } from './PiiReference';

export type IdentityIdentifierType = 'MOBILE' | 'NATIONAL_ID' | 'EMAIL' | 'EXTERNAL_SUBJECT';

@Entity('identity_identifiers')
@Index(['globalSubjectId', 'type', 'blindIndex'])
@Index(['blindIndex'])
export class IdentityIdentifier {
  @PrimaryGeneratedColumn('uuid', { name: 'identifier_id' })
  identifierId!: string;

  @Column({ name: 'global_subject_id', type: 'uuid' })
  globalSubjectId!: string;

  @Column({ name: 'type', type: 'text' })
  type!: IdentityIdentifierType;

  @Column({ name: 'blind_index', type: 'text' })
  blindIndex!: string;

  @Column({ name: 'encrypted_value_ref', type: 'text', nullable: true })
  encryptedValueRef!: string | null;

  @Column({ name: 'pii_reference_id', type: 'uuid', nullable: true })
  piiReferenceId!: string | null;

  @OneToOne(() => PiiReference, { eager: true, nullable: true })
  @JoinColumn({ name: 'pii_reference_id', referencedColumnName: 'piiReferenceId' })
  piiReference!: PiiReference | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;

  @Column({ name: 'status', type: 'text', default: 'active' })
  status!: 'active' | 'revoked';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
