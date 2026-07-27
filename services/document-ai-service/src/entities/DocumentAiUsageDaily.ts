import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('document_ai_usage_daily')
@Index(['tenantId', 'usageDate'], { unique: true })
export class DocumentAiUsageDaily {
  @PrimaryGeneratedColumn('uuid', { name: 'usage_id' })
  usageId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ name: 'usage_date', type: 'date' })
  usageDate!: string; // YYYY-MM-DD

  @Column({ name: 'jobs_started', type: 'int', default: 0 })
  jobsStarted!: number;

  @Column({ name: 'jobs_completed', type: 'int', default: 0 })
  jobsCompleted!: number;

  @Column({ name: 'jobs_failed', type: 'int', default: 0 })
  jobsFailed!: number;

  @Column({ name: 'ai_requests', type: 'int', default: 0 })
  aiRequests!: number;

  @Column({ name: 'approx_input_chars', type: 'int', default: 0 })
  approxInputChars!: number;

  @Column({ name: 'approx_output_chars', type: 'int', default: 0 })
  approxOutputChars!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
