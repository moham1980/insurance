import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type QuoteRequestStatus = 'pending' | 'in_progress' | 'completed' | 'partial' | 'expired' | 'referred';

@Entity('quote_requests')
@Index(['tenantId'])
@Index(['submissionId'])
@Index(['correlationId'])
@Index(['status'])
export class QuoteRequest {
  @PrimaryGeneratedColumn('uuid', { name: 'quote_request_id' })
  quoteRequestId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'submission_id', type: 'uuid' })
  submissionId!: string;

  @Column({ name: 'correlation_id', type: 'text' })
  correlationId!: string;

  @Column({ name: 'status', type: 'text', default: 'pending' })
  status!: QuoteRequestStatus;

  @Column({ name: 'requested_at', type: 'timestamptz' })
  requestedAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'quote_count', type: 'int', default: 0 })
  quoteCount!: number;

  @Column({ name: 'carriers_requested', type: 'uuid', array: true, default: () => "ARRAY[]::uuid[]" })
  carriersRequested!: string[];

  @Column({ name: 'carriers_responded', type: 'uuid', array: true, default: () => "ARRAY[]::uuid[]" })
  carriersResponded!: string[];

  @Column({ name: 'timeout_ms', type: 'int', default: 30000 })
  timeoutMs!: number;

  @Column({ name: 'subjectivities_snapshot', type: 'jsonb', nullable: true })
  subjectivitiesSnapshot!: Record<string, any>[] | null;

  @Column({ name: 'aml_snapshot', type: 'jsonb', nullable: true })
  amlSnapshot!: Record<string, any> | null;

  @Column({ name: 'underwriting_snapshot', type: 'jsonb', nullable: true })
  underwritingSnapshot!: Record<string, any> | null;

  @Column({ name: 'selection_criteria', type: 'jsonb', nullable: true })
  selectionCriteria!: { strategy: 'best_price' | 'best_coverage' | 'fastest_response' | 'manual'; maxResults?: number } | null;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
