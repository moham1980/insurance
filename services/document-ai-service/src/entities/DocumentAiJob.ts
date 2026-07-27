import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type DocumentAiJobStatus = 'pending' | 'processing' | 'retry' | 'dead_letter' | 'completed';

@Entity('document_ai_jobs')
@Index(['status', 'nextRunAt'])
@Index(['documentId', 'createdAt'])
export class DocumentAiJob {
  @PrimaryGeneratedColumn('uuid', { name: 'job_id' })
  jobId!: string;

  @Column({ name: 'dedupe_key', type: 'text', unique: true })
  dedupeKey!: string;

  @Column({ name: 'source_topic', type: 'text', nullable: true })
  sourceTopic!: string | null;

  @Column({ name: 'source_event_id', type: 'text', nullable: true })
  sourceEventId!: string | null;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId!: string;

  @Column({ name: 'claim_id', type: 'uuid', nullable: true })
  claimId!: string | null;

  @Column({ name: 'correlation_id', type: 'text', nullable: true })
  correlationId!: string | null;

  @Column({ name: 'tenant_id', type: 'text', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'actor_user_id', type: 'text', nullable: true })
  actorUserId!: string | null;

  @Column({ name: 'traceparent', type: 'text', nullable: true })
  traceparent!: string | null;

  @Column({ name: 'status', type: 'text', default: 'pending' })
  status!: DocumentAiJobStatus;

  @Column({ name: 'attempt', type: 'int', default: 0 })
  attempt!: number;

  @Column({ name: 'max_attempts', type: 'int', default: 5 })
  maxAttempts!: number;

  @Column({ name: 'next_run_at', type: 'timestamptz', nullable: true })
  nextRunAt!: Date | null;

  @Column({ name: 'locked_at', type: 'timestamptz', nullable: true })
  lockedAt!: Date | null;

  @Column({ name: 'locked_by', type: 'text', nullable: true })
  lockedBy!: string | null;

  @Column({ name: 'last_error_message', type: 'text', nullable: true })
  lastErrorMessage!: string | null;

  @Column({ name: 'last_error_stack', type: 'text', nullable: true })
  lastErrorStack!: string | null;

  @Column({ name: 'dlq_reason', type: 'text', nullable: true })
  dlqReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
