import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('policy_changes')
@Index(['policyId', 'createdAt'])
@Index(['tenantId', 'createdAt'])
@Index(['type', 'createdAt'])
export class PolicyChange {
  @PrimaryGeneratedColumn('uuid', { name: 'change_id' })
  changeId!: string;

  @Column({ name: 'tenant_id', type: 'text', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'policy_id', type: 'uuid' })
  policyId!: string;

  @Column({ name: 'type', type: 'text' })
  type!:
    | 'endorsement'
    | 'cancellation'
    | 'renewal'
    | 'unique_code_set'
    | 'underwriting_requested'
    | 'underwriting_decision'
    | 'quality_gate_override_issue'
    | 'quality_gate_override_set_unique_code'
    | 'auto_renew_updated'
    | 'lapse'
    | 'sanhab_result_recorded'
    | 'broker_change';

  @Column({ name: 'actor_user_id', type: 'text', nullable: true })
  actorUserId!: string | null;

  @Column({ name: 'correlation_id', type: 'text', nullable: true })
  correlationId!: string | null;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason!: string | null;

  @Column({ name: 'before', type: 'jsonb', nullable: true })
  before!: Record<string, any> | null;

  @Column({ name: 'after', type: 'jsonb', nullable: true })
  after!: Record<string, any> | null;

  @Column({ name: 'payload', type: 'jsonb', nullable: true })
  payload!: Record<string, any> | null;

  // Archival fields for data retention
  @Column({ name: 'archived', type: 'boolean', default: false })
  archived!: boolean;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  // Prevent updates/deletes to append-only audit log
  afterLoad() {
    Object.freeze(this);
  }
}
