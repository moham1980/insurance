import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('outbox_events')
@Index(['status', 'occurredAt'])
@Index(['correlationId'])
export class OutboxEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'occurred_at', type: 'timestamptz', default: () => 'NOW()' })
  occurredAt: Date;

  @Column({ name: 'topic', type: 'text' })
  topic: string;

  @Column({ name: 'event_type', type: 'text' })
  eventType: string;

  @Column({ name: 'event_version', type: 'int' })
  eventVersion: number;

  @Column({ name: 'correlation_id', type: 'text' })
  correlationId: string;

  @Column({ name: 'subject_json', type: 'jsonb' })
  subjectJson: object;

  @Column({ name: 'payload_json', type: 'jsonb' })
  payloadJson: object;

  @Column({ name: 'status', type: 'text', default: 'pending' })
  status: 'pending' | 'sent' | 'failed';

  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;
}
