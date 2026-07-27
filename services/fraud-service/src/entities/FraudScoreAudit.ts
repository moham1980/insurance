import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('fraud_score_audit')
@Index(['claimId', 'createdAt'])
export class FraudScoreAudit {
  @PrimaryGeneratedColumn('uuid', { name: 'audit_id' })
  auditId!: string;

  @Column({ name: 'claim_id', type: 'uuid' })
  claimId!: string;

  @Column({ name: 'correlation_id', type: 'text', nullable: true })
  correlationId!: string | null;

  @Column({ name: 'tenant_id', type: 'text', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'actor_user_id', type: 'text', nullable: true })
  actorUserId!: string | null;

  @Column({ name: 'action', type: 'text', nullable: true })
  action!: string | null;

  @Column({ name: 'status', type: 'text', nullable: true })
  status!: string | null;

  @Column({ name: 'input', type: 'jsonb' })
  input!: any;

  @Column({ name: 'score', type: 'int' })
  score!: number;

  @Column({ name: 'signals', type: 'jsonb', nullable: true })
  signals!: string[] | null;

  @Column({ name: 'threshold', type: 'int' })
  threshold!: number;

  @Column({ name: 'hold_claim', type: 'boolean' })
  holdClaim!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
