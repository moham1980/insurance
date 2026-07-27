import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ConsentStatus = 'granted' | 'revoked' | 'expired';
export type ConsentAction = 'grant' | 'revoke' | 'expire';

@Entity('consent_records')
@Index(['tenantId', 'partyId', 'createdAt'])
@Index(['tenantId', 'consentType', 'status'])
export class ConsentRecord {
  @PrimaryGeneratedColumn('uuid', { name: 'consent_record_id' })
  consentRecordId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ type: 'uuid', name: 'party_id' })
  partyId!: string;

  @Column({ name: 'consent_type', type: 'text' })
  consentType!: string;

  @Column({ name: 'purpose', type: 'text' })
  purpose!: string;

  @Column({ name: 'legal_basis', type: 'text' })
  legalBasis!: string;

  @Column({ name: 'status', type: 'text' })
  status!: ConsentStatus;

  @Column({ name: 'action', type: 'text' })
  action!: ConsentAction;

  @Column({ name: 'actor_id', type: 'text' })
  actorId!: string;

  @Column({ name: 'actor_role', type: 'text' })
  actorRole!: string;

  @Column({ name: 'channel', type: 'text' })
  channel!: string;

  @Column({ name: 'evidence', type: 'jsonb', nullable: true })
  evidence!: Record<string, any> | null;

  @Column({ name: 'revoke_reason', type: 'text', nullable: true })
  revokeReason!: string | null;

  @Column({ name: 'valid_to', type: 'timestamptz', nullable: true })
  validTo!: Date | null;

  @Column({ name: 'version', type: 'int', default: 1 })
  version!: number;

  @Column({ name: 'previous_record_id', type: 'uuid', nullable: true })
  previousRecordId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
