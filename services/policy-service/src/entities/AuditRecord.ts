import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type AuditAction = 'create' | 'read' | 'update' | 'delete' | 'issue' | 'cancel' | 'approve' | 'reject' | 'login' | 'logout';

@Entity('audit_records')
@Index(['tenantId', 'action', 'createdAt'])
@Index(['actorUserId', 'createdAt'])
export class AuditRecord {
  @PrimaryGeneratedColumn('uuid', { name: 'audit_id' })
  auditId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ name: 'actor_user_id', type: 'text', nullable: true })
  actorUserId!: string | null;

  @Column({ name: 'action', type: 'text' })
  action!: AuditAction;

  @Column({ name: 'resource_type', type: 'text' })
  resourceType!: string;

  @Column({ name: 'resource_id', type: 'text', nullable: true })
  resourceId!: string | null;

  @Column({ name: 'correlation_id', type: 'text', nullable: true })
  correlationId!: string | null;

  @Column({ name: 'before', type: 'jsonb', nullable: true })
  before!: Record<string, unknown> | null;

  @Column({ name: 'after', type: 'jsonb', nullable: true })
  after!: Record<string, unknown> | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
