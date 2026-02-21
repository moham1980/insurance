import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('dead_letter_queue')
@Index(['topic', 'status'])
@Index(['retryCount', 'nextRetryAt'])
@Index(['createdAt'])
export class DeadLetterEvent {
  @PrimaryGeneratedColumn('uuid', { name: 'dlq_id' })
  dlqId: string;

  @Column({ name: 'original_event_id', type: 'text' })
  originalEventId: string;

  @Column({ name: 'topic', type: 'text' })
  topic: string;

  @Column({ name: 'partition', type: 'int', nullable: true })
  partition: number | null;

  @Column({ name: 'offset', type: 'text', nullable: true })
  offset: string | null;

  @Column({ name: 'key', type: 'text', nullable: true })
  key: string | null;

  @Column({ name: 'value', type: 'jsonb' })
  value: any;

  @Column({ name: 'headers', type: 'jsonb', nullable: true })
  headers: any | null;

  @Column({ name: 'error_message', type: 'text' })
  errorMessage: string;

  @Column({ name: 'error_stack', type: 'text', nullable: true })
  errorStack: string | null;

  @Column({ name: 'consumer_group', type: 'text' })
  consumerGroup: string;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({ name: 'max_retries', type: 'int', default: 3 })
  maxRetries: number;

  @Column({ name: 'status', type: 'text', default: 'pending' })
  status: 'pending' | 'retrying' | 'failed' | 'resolved';

  @Column({ name: 'next_retry_at', type: 'timestamptz', nullable: true })
  nextRetryAt: Date | null;

  @Column({ name: 'last_error_at', type: 'timestamptz', default: () => 'NOW()' })
  lastErrorAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;
}
