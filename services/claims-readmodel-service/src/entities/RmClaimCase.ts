import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

@Entity('rm_claims_cases')
@Index(['tenantId'])
@Index(['policyId'])
@Index(['status', 'updatedAt'])
@Index(['tenantId', 'status'])
export class RmClaimCase {
  @PrimaryColumn({ name: 'claim_id', type: 'uuid' })
  claimId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'claim_number', type: 'text', nullable: true })
  claimNumber: string | null;

  @Column({ name: 'policy_id', type: 'uuid', nullable: true })
  policyId: string | null;

  @Column({ name: 'status', type: 'text' })
  status: string;

  @Column({ name: 'loss_date', type: 'timestamptz', nullable: true })
  lossDate: Date | null;

  @Column({ name: 'loss_type', type: 'text', nullable: true })
  lossType: string | null;

  @Column({ name: 'requires_human_triage', type: 'boolean', nullable: true })
  requiresHumanTriage: boolean | null;

  @Column({ name: 'assessed_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  assessedAmount: string | null;

  @Column({ name: 'approved_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  approvedAmount: string | null;

  @Column({ name: 'paid_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  paidAmount: string | null;

  @Column({ name: 'currency', type: 'text', nullable: true })
  currency: string | null;

  @Column({ name: 'adjuster_id', type: 'uuid', nullable: true })
  adjusterId: string | null;

  @Column({ name: 'fraud_case_id', type: 'uuid', nullable: true })
  fraudCaseId: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', nullable: true })
  createdAt: Date | null;

  @Column({ name: 'last_event_id', type: 'uuid', nullable: true })
  lastEventId: string | null;

  @Column({ name: 'last_event_version', type: 'int', nullable: true })
  lastEventVersion: number | null;

  @Column({ name: 'last_occurred_at', type: 'timestamptz', nullable: true })
  lastOccurredAt: Date | null;

  @Column({ name: 'ri_contract_id', type: 'uuid', nullable: true })
  riContractId: string | null;

  @Column({ name: 'ri_last_recovery_id', type: 'uuid', nullable: true })
  riLastRecoveryId: string | null;

  @Column({ name: 'ri_recoverable_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  riRecoverableAmount: string | null;

  @Column({ name: 'ri_recovered_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  riRecoveredAmount: string | null;

  @Column({ name: 'ri_currency', type: 'text', nullable: true })
  riCurrency: string | null;

  @Column({ name: 'ri_last_identified_at', type: 'timestamptz', nullable: true })
  riLastIdentifiedAt: Date | null;

  @Column({ name: 'ri_last_received_at', type: 'timestamptz', nullable: true })
  riLastReceivedAt: Date | null;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;
}
