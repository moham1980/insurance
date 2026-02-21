import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

@Entity('rm_claims_cases')
@Index(['policyId'])
@Index(['status', 'updatedAt'])
export class RmClaimCase {
  @PrimaryColumn({ name: 'claim_id', type: 'uuid' })
  claimId: string;

  @Column({ name: 'claim_number', type: 'text' })
  claimNumber: string;

  @Column({ name: 'policy_id', type: 'uuid' })
  policyId: string;

  @Column({ name: 'status', type: 'text' })
  status: string;

  @Column({ name: 'loss_date', type: 'timestamptz', nullable: true })
  lossDate: Date | null;

  @Column({ name: 'loss_type', type: 'text', nullable: true })
  lossType: string | null;

  @Column({ name: 'requires_human_triage', type: 'boolean', nullable: true })
  requiresHumanTriage: boolean | null;

  @Column({ name: 'created_at', type: 'timestamptz', nullable: true })
  createdAt: Date | null;

  @Column({ name: 'last_event_id', type: 'uuid', nullable: true })
  lastEventId: string | null;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;
}
