import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('saga_instances')
@Index(['sagaType', 'status'])
@Index(['correlationId'])
@Index(['tenantId'])
@Index(['createdAt'])
export class SagaInstance {
  @PrimaryGeneratedColumn('uuid', { name: 'saga_id' })
  sagaId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'saga_type', type: 'text' })
  sagaType: 'ClaimPayment' | 'PolicyIssuance' | 'ComplaintResolution' | 'FraudInvestigation' | 'ReinsuranceRecovery';

  @Column({ name: 'status', type: 'text' })
  status: 'started' | 'waiting' | 'completed' | 'failed' | 'compensating' | 'compensated';

  @Column({ name: 'correlation_id', type: 'text' })
  correlationId: string;

  @Column({ name: 'claim_id', type: 'uuid', nullable: true })
  claimId: string | null;

  @Column({ name: 'policy_id', type: 'uuid', nullable: true })
  policyId: string | null;

  @Column({ name: 'current_step', type: 'text' })
  currentStep: string;

  @Column({ name: 'completed_steps', type: 'text', array: true, default: () => 'ARRAY[]::text[]' })
  completedSteps: string[];

  @Column({ name: 'context', type: 'jsonb', nullable: true })
  context: Record<string, any> | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
