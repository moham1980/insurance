import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type ClaimPartyRole = 'claimant' | 'insured' | 'beneficiary' | 'witness' | 'representative' | 'adjuster' | 'third_party';

@Entity('claim_parties')
@Index(['claimId'])
@Index(['partyId'])
@Index(['tenantId'])
export class ClaimParty {
  @PrimaryGeneratedColumn('uuid', { name: 'claim_party_id' })
  claimPartyId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'claim_id', type: 'uuid' })
  claimId: string;

  @Column({ name: 'party_id', type: 'uuid' })
  partyId: string;

  @Column({ name: 'party_role', type: 'text' })
  partyRole: ClaimPartyRole;

  @Column({ name: 'role_description', type: 'text', nullable: true })
  roleDescription: string | null;

  @Column({ name: 'contact_info', type: 'jsonb', nullable: true })
  contactInfo: Record<string, any> | null;

  @Column({ name: 'consent_record_id', type: 'uuid', nullable: true })
  consentRecordId: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
