import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type ModelCardStatus = 'draft' | 'review' | 'approved' | 'deprecated' | 'archived';
export type BiasRiskLevel = 'low' | 'medium' | 'high';

@Entity('model_cards')
@Index(['modelId'])
@Index(['status'])
@Index(['tenantId'])
export class ModelCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // P0 security: tenant isolation — model cards are scoped per tenant.
  // Nullable for backward compatibility with pre-existing rows.
  @Column({ type: 'uuid', nullable: true })
  tenantId: string | null;

  @Column({ type: 'uuid' })
  modelId: string;

  @Column({ type: 'text' })
  modelName: string;

  @Column({ type: 'text', nullable: true })
  purpose: string | null;

  @Column({ type: 'text', nullable: true })
  intendedUse: string | null;

  @Column({ type: 'text', nullable: true })
  limitations: string | null;

  @Column({ type: 'text', nullable: true })
  trainingDataDescription: string | null;

  @Column({ type: 'jsonb', nullable: true })
  performanceMetrics: Record<string, number> | null;

  @Column({ type: 'enum', enum: ['low', 'medium', 'high'] })
  biasRiskLevel: BiasRiskLevel;

  @Column({ type: 'jsonb', nullable: true })
  fairnessAudit: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  explainability: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  ethicalReviewBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  ethicalReviewAt: Date | null;

  @Column({ type: 'enum', enum: ['draft', 'review', 'approved', 'deprecated', 'archived'], default: 'draft' })
  status: ModelCardStatus;

  @Column({ type: 'text', nullable: true })
  approvedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  version: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
