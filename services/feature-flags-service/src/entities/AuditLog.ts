import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

/**
 * P1 #10: Immutable audit log for feature flag changes.
 * Each row records who changed what, when, and the before/after state.
 */
@Entity({ name: 'feature_flag_audit_log' })
@Index(['resourceType', 'resourceId'])
@Index(['actor'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid', { name: 'audit_log_id' })
  auditLogId!: string;

  @Column({ name: 'resource_type', type: 'text' })
  resourceType!: string; // e.g. 'feature_flag'

  @Column({ name: 'resource_id', type: 'text' })
  resourceId!: string; // e.g. flag name

  @Column({ type: 'text' })
  action!: string; // e.g. 'created', 'updated', 'deleted'

  @Column({ type: 'text' })
  actor!: string; // user ID or 'system'

  @Column({ type: 'jsonb', nullable: true })
  before!: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  after!: Record<string, any> | null;

  @Column({ name: 'correlation_id', type: 'text', nullable: true })
  correlationId!: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;
}
