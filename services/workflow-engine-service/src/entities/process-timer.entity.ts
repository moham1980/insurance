import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum TimerStatus {
  PENDING = 'pending',
  FIRED = 'fired',
  CANCELLED = 'cancelled',
}

@Entity('process_timers')
export class ProcessTimer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  tenantId: string;

  @Column()
  @Index()
  instanceId: string;

  @Column()
  nodeId: string;

  @Column()
  @Index()
  fireAt: Date;

  @Column({
    type: 'enum',
    enum: TimerStatus,
    default: TimerStatus.PENDING,
  })
  status: TimerStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  firedAt: Date;
}
