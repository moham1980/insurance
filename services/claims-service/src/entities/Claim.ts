import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('claims')
@Index(['claimNumber'], { unique: true })
@Index(['policyId'])
@Index(['status', 'updatedAt'])
export class Claim {
  @PrimaryGeneratedColumn('uuid', { name: 'claim_id' })
  claimId: string;

  @Column({ name: 'claim_number', type: 'text', unique: true })
  claimNumber: string;

  @Column({ name: 'policy_id', type: 'uuid' })
  policyId: string;

  @Column({ name: 'claimant_party_id', type: 'uuid' })
  claimantPartyId: string;

  @Column({ name: 'loss_date', type: 'timestamptz' })
  lossDate: Date;

  @Column({ name: 'loss_type', type: 'text' })
  lossType: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'status', type: 'text', default: 'registered' })
  status: 'registered' | 'assessed' | 'approved' | 'paid' | 'closed' | 'rejected';

  @Column({ name: 'assessed_amount', type: 'numeric', nullable: true })
  assessedAmount: number | null;

  @Column({ name: 'approved_amount', type: 'numeric', nullable: true })
  approvedAmount: number | null;

  @Column({ name: 'paid_amount', type: 'numeric', nullable: true })
  paidAmount: number | null;

  @Column({ name: 'requires_human_triage', type: 'boolean', default: true })
  requiresHumanTriage: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
