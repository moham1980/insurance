import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('saga_instances')
@Index(['sagaType', 'status'])
@Index(['correlationId'])
@Index(['createdAt'])
export class SagaInstance {
  @PrimaryGeneratedColumn('uuid', { name: 'saga_id' })
  sagaId: string;

  @Column({ name: 'saga_type', type: 'text' })
  sagaType: 'ClaimPayment' | 'PolicyIssuance' | 'ComplaintResolution';

  @Column({ name: 'status', type: 'text' })
  status: 'started' | 'waiting' | 'completed' | 'failed' | 'compensating';

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

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
