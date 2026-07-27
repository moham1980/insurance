import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('rm_fraud_signal')
@Index(['updatedAt'])
export class RmFraudSignal {
  @PrimaryColumn({ name: 'claim_id', type: 'uuid' })
  claimId!: string;

  @Column({ name: 'claim_number', type: 'text', nullable: true })
  claimNumber!: string | null;

  @Column({ name: 'latest_score', type: 'int', nullable: true })
  latestScore!: number | null;

  @Column({ name: 'hold_claim', type: 'boolean', nullable: true })
  holdClaim!: boolean | null;

  @Column({ name: 'score_computed_at', type: 'timestamptz', nullable: true })
  scoreComputedAt!: Date | null;

  @Column({ name: 'case_opened_at', type: 'timestamptz', nullable: true })
  caseOpenedAt!: Date | null;

  @Column({ name: 'case_closed_at', type: 'timestamptz', nullable: true })
  caseClosedAt!: Date | null;

  @Column({ name: 'case_resolution', type: 'text', nullable: true })
  caseResolution!: string | null;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;
}
