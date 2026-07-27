import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('fraud_cases')
@Index(['claimId'])
@Index(['status', 'createdAt'])
export class FraudCase {
  @PrimaryGeneratedColumn('uuid', { name: 'fraud_case_id' })
  fraudCaseId: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @Column({ name: 'claim_id', type: 'uuid' })
  claimId: string;

  @Column({ name: 'claimant_id', type: 'uuid', nullable: true })
  claimantId: string | null;

  @Column({ name: 'claim_number', type: 'text' })
  claimNumber: string;

  @Column({ name: 'policy_id', type: 'uuid', nullable: true })
  policyId: string | null;

  @Column({ name: 'party_id', type: 'uuid', nullable: true })
  partyId: string | null;

  @Column({ name: 'loss_type', type: 'text', nullable: true })
  lossType: string | null;

  @Column({ name: 'amount', type: 'numeric', nullable: true })
  amount: number | null;

  @Column({ name: 'claim_amount', type: 'numeric', nullable: true })
  claimAmount: number | null;

  @Column({ name: 'score', type: 'numeric' })
  score: number;

  @Column({ name: 'signals', type: 'jsonb', nullable: true })
  signals: string[] | null;

  @Column({ name: 'status', type: 'text', default: 'open' })
  status: 'open' | 'investigating' | 'confirmed' | 'cleared' | 'closed';

  @Column({ name: 'assigned_to', type: 'text', nullable: true })
  assignedTo: string | null;

  @Column({ name: 'hold_claim', type: 'boolean', default: true })
  holdClaim: boolean;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
