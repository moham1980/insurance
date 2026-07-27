import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('external_verification_request')
@Index(['tenantId', 'partyId'])
export class ExternalVerificationRequestEntity {
  @PrimaryColumn({ type: 'uuid', name: 'request_id' })
  requestId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ type: 'uuid', name: 'party_id' })
  partyId!: string;

  @Column({ name: 'service_type', type: 'varchar' })
  serviceType!: 'sanctions' | 'pep' | 'adverse_media' | 'identity';

  @Column({ name: 'provider_name', type: 'varchar', nullable: true })
  providerName!: string | null;

  @Column({ name: 'provider_request_id', type: 'varchar', nullable: true })
  providerRequestId!: string | null;

  @Column({ name: 'request_payload', type: 'jsonb' })
  requestPayload!: Record<string, any>;

  @CreateDateColumn({ name: 'requested_at' })
  requestedAt!: Date;

  @Column({ type: 'varchar', default: 'pending' })
  status!: 'pending' | 'completed' | 'failed' | 'awaiting_provider';

  @Column({ name: 'response_payload', type: 'jsonb', nullable: true })
  responsePayload!: Record<string, any> | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;
}
