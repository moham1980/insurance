import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('identity_links')
@Index(['globalSubjectId', 'tenantId', 'localPartyId'])
@Index(['tenantId', 'localPartyId'])
export class IdentityLink {
  @PrimaryGeneratedColumn('uuid', { name: 'link_id' })
  linkId!: string;

  @Column({ name: 'global_subject_id', type: 'uuid' })
  globalSubjectId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ name: 'local_party_id', type: 'uuid' })
  localPartyId!: string;

  @Column({ name: 'verification_level', type: 'text', default: 'none' })
  verificationLevel!: 'none' | 'mobile' | 'national_id' | 'kyc' | 'biometric';

  @Column({ name: 'linked_at', type: 'timestamptz' })
  linkedAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
