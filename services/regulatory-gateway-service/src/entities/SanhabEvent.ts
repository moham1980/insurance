import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

@Entity('sanhab_events')
@Index(['externalEventId'], { unique: true })
@Index(['eventType', 'receivedAt'])
export class SanhabEvent {
  @PrimaryGeneratedColumn('uuid', { name: 'sanhab_event_id' })
  sanhabEventId!: string;

  @Column({ name: 'external_event_id', type: 'text' })
  externalEventId!: string;

  @Column({ name: 'event_type', type: 'text' })
  eventType!: string;

  @Column({ name: 'source', type: 'text', default: 'sanhab' })
  source!: string;

  @Column({ name: 'correlation_id', type: 'text' })
  correlationId!: string;

  @Column({ name: 'payload', type: 'jsonb' })
  payload!: any;

  @Column({ name: 'headers', type: 'jsonb', nullable: true })
  headers!: Record<string, string> | null;

  @CreateDateColumn({ name: 'received_at', type: 'timestamptz' })
  receivedAt!: Date;
}
