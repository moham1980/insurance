import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('rm_fraud_cases')
@Index(['tenantId'])
@Index(['status', 'updatedAt'])
@Index(['latestScore', 'updatedAt'])
@Index(['tenantId', 'status'])
export class RmFraudCase {
  @PrimaryColumn({ name: 'claim_id', type: 'uuid' })
  claimId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'fraud_case_id', type: 'uuid', nullable: true })
  fraudCaseId: string | null;

  @Column({ name: 'claim_number', type: 'text', nullable: true })
  claimNumber: string | null;

  @Column({ name: 'latest_score', type: 'int', nullable: true })
  latestScore: number | null;

  @Column({ name: 'hold_claim', type: 'boolean', nullable: true })
  holdClaim: boolean | null;

  @Column({ name: 'status', type: 'text', nullable: true })
  status: string | null;

  @Column({ name: 'assigned_to', type: 'text', nullable: true })
  assignedTo: string | null;

  @Column({ name: 'score_computed_at', type: 'timestamptz', nullable: true })
  scoreComputedAt: Date | null;

  @Column({ name: 'case_opened_at', type: 'timestamptz', nullable: true })
  caseOpenedAt: Date | null;

  @Column({ name: 'case_closed_at', type: 'timestamptz', nullable: true })
  caseClosedAt: Date | null;

  @Column({ name: 'case_resolution', type: 'text', nullable: true })
  caseResolution: string | null;

  @Column({ name: 'last_event_id', type: 'uuid', nullable: true })
  lastEventId: string | null;

  @Column({ name: 'last_event_version', type: 'int', nullable: true })
  lastEventVersion: number | null;

  @Column({ name: 'last_occurred_at', type: 'timestamptz', nullable: true })
  lastOccurredAt: Date | null;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;
}
