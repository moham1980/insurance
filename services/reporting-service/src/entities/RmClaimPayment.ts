import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('rm_claim_payment')
@Index(['updatedAt'])
export class RmClaimPayment {
  @PrimaryColumn({ name: 'claim_id', type: 'uuid' })
  claimId!: string;

  @Column({ name: 'claim_number', type: 'text', nullable: true })
  claimNumber!: string | null;

  @Column({ name: 'policy_id', type: 'uuid', nullable: true })
  policyId!: string | null;

  @Column({ name: 'registered_at', type: 'timestamptz', nullable: true })
  registeredAt!: Date | null;

  @Column({ name: 'payment_requested_at', type: 'timestamptz', nullable: true })
  paymentRequestedAt!: Date | null;

  @Column({ name: 'approved_amount', type: 'numeric', nullable: true })
  approvedAmount!: string | null;

  @Column({ name: 'payment_executed_at', type: 'timestamptz', nullable: true })
  paymentExecutedAt!: Date | null;

  @Column({ name: 'claim_paid_at', type: 'timestamptz', nullable: true })
  claimPaidAt!: Date | null;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;
}
