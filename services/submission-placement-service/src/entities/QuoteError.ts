import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('quote_errors')
@Index(['quoteRequestId'])
@Index(['submissionId'])
@Index(['carrierOrganizationId'])
export class QuoteError {
  @PrimaryGeneratedColumn('uuid', { name: 'quote_error_id' })
  quoteErrorId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'quote_request_id', type: 'uuid' })
  quoteRequestId!: string;

  @Column({ name: 'submission_id', type: 'uuid' })
  submissionId!: string;

  @Column({ name: 'carrier_organization_id', type: 'uuid' })
  carrierOrganizationId!: string;

  @Column({ name: 'carrier_connector_id', type: 'uuid', nullable: true })
  carrierConnectorId!: string | null;

  @Column({ name: 'connector_type', type: 'text', nullable: true })
  connectorType!: string | null;

  @Column({ name: 'error_code', type: 'text' })
  errorCode!: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'error_detail', type: 'jsonb', nullable: true })
  errorDetail!: Record<string, any> | null;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
