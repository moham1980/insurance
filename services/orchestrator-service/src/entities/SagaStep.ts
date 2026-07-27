import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('saga_steps')
@Index(['sagaId'])
@Index(['tenantId'])
@Index(['stepName'])
@Index(['status', 'startedAt'])
export class SagaStep {
  @PrimaryGeneratedColumn('uuid', { name: 'step_id' })
  stepId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'saga_id', type: 'uuid' })
  sagaId: string;

  @Column({ name: 'step_name', type: 'text' })
  stepName: string;

  @Column({ name: 'step_order', type: 'integer' })
  stepOrder: number;

  @Column({ name: 'status', type: 'text' })
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'compensating' | 'compensated' | 'compensation_failed';

  @Column({ name: 'input_payload', type: 'jsonb', nullable: true })
  inputPayload: Record<string, any> | null;

  @Column({ name: 'output_payload', type: 'jsonb', nullable: true })
  outputPayload: Record<string, any> | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'error_code', type: 'text', nullable: true })
  errorCode: string | null;

  @Column({ name: 'retry_count', type: 'integer', default: 0 })
  retryCount: number;

  @Column({ name: 'max_retries', type: 'integer', default: 3 })
  maxRetries: number;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'compensated_at', type: 'timestamptz', nullable: true })
  compensatedAt: Date | null;

  @Column({ name: 'duration_ms', type: 'integer', nullable: true })
  durationMs: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
