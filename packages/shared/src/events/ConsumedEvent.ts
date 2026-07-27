import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

@Entity('consumed_events')
@Index(['consumedAt'])
export class ConsumedEvent {
  @PrimaryColumn({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @PrimaryColumn({ name: 'consumer_name', type: 'text' })
  consumerName: string;

  @Column({ name: 'consumed_at', type: 'timestamptz', default: () => 'NOW()' })
  consumedAt: Date;

  @Column({ name: 'topic', type: 'text' })
  topic: string;

  @Column({ name: 'processed', type: 'boolean', default: false })
  processed: boolean;

  @Column({ name: 'error', type: 'text', nullable: true })
  error: string | null;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date | null;
}
