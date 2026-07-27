import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ReClaimRecoveryStatus = 'open' | 'in_collection' | 'partially_collected' | 'collected' | 'written_off' | 'closed';

@Entity('re_claim_recoveries')
@Index(['treatyId', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['claimId'])
export class ReClaimRecovery {
  @PrimaryGeneratedColumn('uuid', { name: 'recovery_id' })
  recoveryId!: string;

  @Column({ name: 'treaty_id', type: 'uuid' })
  treatyId!: string;

  @Column({ name: 'claim_id', type: 'text' })
  claimId!: string;

  @Column({ name: 'policy_id', type: 'text', nullable: true })
  policyId!: string | null;

  @Column({ name: 'loss_date', type: 'date', nullable: true })
  lossDate!: string | null;

  @Column({ name: 'gross_loss_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  grossLossAmount!: string | null;

  @Column({ name: 'ceded_loss_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  cededLossAmount!: string | null;

  @Column({ name: 'recovered_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  recoveredAmount!: string | null;

  @Column({ name: 'currency', type: 'text', default: 'IRR' })
  currency!: string;

  @Column({ name: 'status', type: 'text', default: 'open' })
  status!: ReClaimRecoveryStatus;

  @Column({ name: 'next_follow_up_at', type: 'timestamptz', nullable: true })
  nextFollowUpAt!: Date | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
