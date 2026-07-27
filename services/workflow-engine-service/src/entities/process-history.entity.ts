import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum HistoryEventType {
  NODE_ENTER = 'node_enter',
  NODE_EXIT = 'node_exit',
  NODE_ERROR = 'node_error',
  VARIABLE_SET = 'variable_set',
  SIGNAL_RECEIVED = 'signal_received',
  TIMER_TRIGGERED = 'timer_triggered',
  EVENT_RECEIVED = 'event_received',
  PARALLEL_FORK = 'parallel_fork',
  PARALLEL_JOIN = 'parallel_join',
  PROCESS_START = 'process_start',
  PROCESS_END = 'process_end',
  PROCESS_CANCEL = 'process_cancel',
}

@Entity('process_history')
export class ProcessHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  tenantId: string;

  @Column()
  instanceId: string;

  @Column()
  eventType: HistoryEventType;

  @Column({ nullable: true })
  nodeId: string;

  @Column({ nullable: true })
  nodeName: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  error: {
    message: string;
    code?: string;
    details?: any;
  };

  @Column({ type: 'int', default: 0 })
  executionTime: number; // in milliseconds

  @CreateDateColumn()
  timestamp: Date;

  @Column({ nullable: true })
  userId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
