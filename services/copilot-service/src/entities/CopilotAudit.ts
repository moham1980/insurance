import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type CopilotDecision = 'allowed' | 'blocked';

@Entity('copilot_audit')
@Index(['resourceType', 'resourceId', 'createdAt'])
@Index(['decision', 'createdAt'])
export class CopilotAudit {
  @PrimaryGeneratedColumn('uuid', { name: 'audit_id' })
  auditId!: string;

  @Column({ name: 'resource_type', type: 'text' })
  resourceType!: 'claim' | 'document' | 'policy' | 'complaint';

  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId!: string;

  @Column({ name: 'correlation_id', type: 'text', nullable: true })
  correlationId!: string | null;

  @Column({ name: 'tenant_id', type: 'text', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'actor_user_id', type: 'text', nullable: true })
  actorUserId!: string | null;

  @Column({ name: 'ai_enabled_header', type: 'text', nullable: true })
  aiEnabledHeader!: string | null;

  @Column({ name: 'policy_allowed', type: 'boolean', default: false })
  policyAllowed!: boolean;

  @Column({ name: 'decision', type: 'text' })
  decision!: CopilotDecision;

  @Column({ name: 'blocked_reason', type: 'text', nullable: true })
  blockedReason!: string | null;

  @Column({ name: 'output_preview', type: 'text', nullable: true })
  outputPreview!: string | null;

  @Column({ name: 'output_redacted', type: 'boolean', default: false })
  outputRedacted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
