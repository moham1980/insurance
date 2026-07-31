import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('usage_records')
export class UsageRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  modelId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  modelVersion: string;

  @Column({ nullable: true })
  tenantId: string;

  @Column()
  capability: string;

  @Column({ type: 'int' })
  inputTokens: number;

  @Column({ type: 'int' })
  outputTokens: number;

  @Column({ type: 'int' })
  totalTokens: number;

  @Column({ type: 'int' })
  costMicroCents: number; // cost in micro-cents

  @Column({ type: 'int' })
  latencyMs: number;

  @Column({ type: 'int', nullable: true })
  qualityScore: number; // 0-100

  @Column({ nullable: true })
  requestId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'timestamp' })
  periodStart: Date;

  @Column({ type: 'timestamp' })
  periodEnd: Date;

  @CreateDateColumn()
  createdAt: Date;
}
