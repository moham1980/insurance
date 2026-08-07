import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ModelType = 'llm' | 'ml' | 'ocr' | 'embedding' | 'other';
export type ModelStatus = 'development' | 'testing' | 'staging' | 'production' | 'deprecated' | 'retired' | 'pending_approval';
export type ModelRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type PiiHandling = 'redact' | 'anonymize' | 'forbidden';

@Entity('model_inventory')
@Index(['modelType', 'status'])
@Index(['status', 'createdAt'])
@Index(['version', 'modelType'])
@Index(['tenantId', 'status'])
export class ModelInventory {
  @PrimaryGeneratedColumn('uuid', { name: 'model_id' })
  modelId!: string;

  @Column({ name: 'tenant_id', type: 'text', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'model_name', type: 'text' })
  modelName!: string;

  @Column({ name: 'model_type', type: 'text' })
  modelType!: ModelType;

  @Column({ name: 'version', type: 'text' })
  version!: string;

  @Column({ name: 'provider', type: 'text', nullable: true })
  provider!: string | null;

  @Column({ name: 'status', type: 'text', default: 'development' })
  status!: ModelStatus;

  @Column({ name: 'purpose', type: 'text', nullable: true })
  purpose!: string | null;

  @Column({ name: 'owner', type: 'text', nullable: true })
  owner!: string | null;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'parameters', type: 'jsonb', nullable: true })
  parameters!: object | null;

  @Column({ name: 'risk_level', type: 'text', default: 'medium' })
  riskLevel!: ModelRiskLevel;

  @Column({ name: 'training_data_summary', type: 'text', nullable: true })
  trainingDataSummary!: string | null;

  @Column({ name: 'bias_risks', type: 'jsonb', nullable: true })
  biasRisks!: string[] | null;

  @Column({ name: 'allowed_data_types', type: 'jsonb', nullable: true })
  allowedDataTypes!: string[] | null;

  @Column({ name: 'pii_handling', type: 'text', default: 'redact' })
  piiHandling!: PiiHandling;

  @Column({ name: 'performance_metrics', type: 'jsonb', nullable: true })
  performanceMetrics!: object | null;

  @Column({ name: 'deployment_date', type: 'timestamptz', nullable: true })
  deploymentDate!: Date | null;

  @Column({ name: 'last_evaluation_date', type: 'timestamptz', nullable: true })
  lastEvaluationDate!: Date | null;

  @Column({ name: 'next_evaluation_date', type: 'timestamptz', nullable: true })
  nextEvaluationDate!: Date | null;

  @Column({ name: 'tags', type: 'text', nullable: true })
  tags!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: object | null;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy!: string | null;

  // P1 #5 (SoD): tracks who submitted the model for approval.
  // The approver must be a different user (submitter != approver).
  @Column({ name: 'submitted_by', type: 'text', nullable: true })
  submittedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
