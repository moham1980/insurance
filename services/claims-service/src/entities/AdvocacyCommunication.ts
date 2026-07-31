import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type AdvocacyCommunicationChannel = 'email' | 'sms' | 'call' | 'web' | 'mobile_app';
export type AdvocacyCommunicationDirection = 'inbound' | 'outbound';

@Entity('advocacy_communications')
@Index(['caseId'])
@Index(['partyId'])
@Index(['tenantId'])
export class AdvocacyCommunication {
  @PrimaryGeneratedColumn('uuid', { name: 'communication_id' })
  communicationId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'case_id', type: 'uuid' })
  caseId: string;

  @Column({ name: 'channel', type: 'text' })
  channel: AdvocacyCommunicationChannel;

  @Column({ name: 'direction', type: 'text' })
  direction: AdvocacyCommunicationDirection;

  @Column({ name: 'content_ref', type: 'text' })
  contentRef: string;

  @Column({ name: 'content_encryption_key_ref', type: 'text', nullable: true })
  contentEncryptionKeyRef: string | null;

  @Column({ name: 'party_id', type: 'uuid', nullable: true })
  partyId: string | null;

  @Column({ name: 'subject', type: 'text', nullable: true })
  subject: string | null;

  @Column({ name: 'summary', type: 'text', nullable: true })
  summary: string | null;

  @Column({ name: 'is_pii', type: 'boolean', default: false })
  isPii: boolean;

  @Column({ name: 'consent_record_id', type: 'uuid', nullable: true })
  consentRecordId: string | null;

  @Column({ name: 'timestamp', type: 'timestamptz' })
  timestamp: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
