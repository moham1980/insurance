import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ReCessionStatus = 'pending' | 'approved' | 'settled' | 'rejected';

@Entity('re_cessions')
@Index(['treatyId', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['policyId'])
export class ReCession {
  @PrimaryGeneratedColumn('uuid', { name: 'cession_id' })
  cessionId!: string;

  @Column({ name: 'treaty_id', type: 'uuid' })
  treatyId!: string;

  @Column({ name: 'policy_id', type: 'text', nullable: true })
  policyId!: string | null;

  @Column({ name: 'risk_id', type: 'text', nullable: true })
  riskId!: string | null;

  @Column({ name: 'sum_insured', type: 'numeric', precision: 18, scale: 2, nullable: true })
  sumInsured!: string | null;

  @Column({ name: 'premium', type: 'numeric', precision: 18, scale: 2, nullable: true })
  premium!: string | null;

  @Column({ name: 'cession_percent', type: 'numeric', precision: 6, scale: 3, nullable: true })
  cessionPercent!: string | null;

  @Column({ name: 'ceded_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  cededAmount!: string | null;

  @Column({ name: 'status', type: 'text', default: 'pending' })
  status!: ReCessionStatus;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
