import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ReStatementStatus = 'draft' | 'issued' | 'settled' | 'canceled';

@Entity('re_statements')
@Index(['treatyId', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['periodStart', 'periodEnd'])
export class ReStatement {
  @PrimaryGeneratedColumn('uuid', { name: 'statement_id' })
  statementId!: string;

  @Column({ name: 'treaty_id', type: 'uuid' })
  treatyId!: string;

  @Column({ name: 'statement_type', type: 'text' })
  statementType!: 'bordereau' | 'settlement';

  @Column({ name: 'status', type: 'text', default: 'draft' })
  status!: ReStatementStatus;

  @Column({ name: 'period_start', type: 'date' })
  periodStart!: string;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd!: string;

  @Column({ name: 'totals', type: 'jsonb', nullable: true })
  totals!: any | null;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
