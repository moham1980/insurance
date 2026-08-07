import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

/**
 * P1 #10: Immutable audit log for notification template changes.
 */
@Entity({ name: 'notification_audit_log' })
@Index(['resourceType', 'resourceId'])
@Index(['actor'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid', { name: 'audit_log_id' })
  auditLogId!: string;

  @Column({ name: 'resource_type', type: 'text' })
  resourceType!: string;

  @Column({ name: 'resource_id', type: 'text' })
  resourceId!: string;

  @Column({ type: 'text' })
  action!: string;

  @Column({ type: 'text' })
  actor!: string;

  @Column({ type: 'jsonb', nullable: true })
  before!: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  after!: Record<string, any> | null;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'correlation_id', type: 'text', nullable: true })
  correlationId!: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;
}
