import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type NbaActionStatus = 'recommended' | 'executed' | 'opted_out' | 'dismissed';

@Entity('nba_action_logs')
@Index(['contextType', 'resourceId'])
@Index(['actionCode', 'actorUserId'])
export class NbaActionLog {
  @PrimaryGeneratedColumn('uuid', { name: 'log_id' })
  logId!: string;

  @Column({ name: 'action_id', type: 'text' })
  actionId!: string;

  @Column({ name: 'action_code', type: 'text' })
  actionCode!: string;

  @Column({ name: 'context_type', type: 'text' })
  contextType!: string;

  @Column({ name: 'resource_id', type: 'text' })
  resourceId!: string;

  @Column({ name: 'actor_user_id', type: 'text', nullable: true })
  actorUserId!: string | null;

  @Column({ name: 'tenant_id', type: 'text', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'status', type: 'text', default: 'recommended' })
  status!: NbaActionStatus;

  @Column({ name: 'payload', type: 'jsonb', nullable: true })
  payload!: object | null;

  @Column({ name: 'reason_code', type: 'text', nullable: true })
  reasonCode!: string | null;

  @Column({ name: 'opt_out_reason', type: 'text', nullable: true })
  optOutReason!: string | null;

  @Column({ name: 'confidence', type: 'double precision', default: 0.8 })
  confidence!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
