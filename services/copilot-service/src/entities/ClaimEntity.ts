import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('claims')
export class ClaimEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'claim_id' })
  claimId: string;

  @Column({ name: 'claim_number', type: 'text' })
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

  @Column({ name: 'status', type: 'text' })
  status: string;

  @Column({ name: 'assessed_amount', type: 'numeric', nullable: true })
  assessedAmount: number | null;

  @Column({ name: 'approved_amount', type: 'numeric', nullable: true })
  approvedAmount: number | null;

  @Column({ name: 'paid_amount', type: 'numeric', nullable: true })
  paidAmount: number | null;

  @Column({ name: 'requires_human_triage', type: 'boolean' })
  requiresHumanTriage: boolean;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
