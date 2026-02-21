import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('fraud_cases')
@Index(['claimId'])
@Index(['status', 'createdAt'])
export class FraudCase {
  @PrimaryGeneratedColumn('uuid', { name: 'fraud_case_id' })
  fraudCaseId: string;

  @Column({ name: 'claim_id', type: 'uuid' })
  claimId: string;

  @Column({ name: 'claim_number', type: 'text' })
  claimNumber: string;

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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
