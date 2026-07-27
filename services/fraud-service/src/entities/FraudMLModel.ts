import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum ModelStatus {
  TRAINING = 'training',
  TRAINED = 'trained',
  DEPLOYED = 'deployed',
  DEPRECATED = 'deprecated',
  FAILED = 'failed',
}

export enum ModelType {
  BINARY_CLASSIFICATION = 'binary_classification',
  MULTI_CLASS_CLASSIFICATION = 'multi_class_classification',
  REGRESSION = 'regression',
  ANOMALY_DETECTION = 'anomaly_detection',
}

@Entity('fraud_ml_models')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'modelType'])
export class FraudMLModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId!: string | null;

  @Column({ type: 'varchar', length: 100 })
  modelName!: string;

  @Column({ type: 'varchar', length: 50 })
  modelVersion!: string;

  @Column({ type: 'enum', enum: ModelType })
  modelType!: ModelType;

  @Column({ type: 'enum', enum: ModelStatus, default: ModelStatus.TRAINING })
  status!: ModelStatus;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'jsonb' })
  modelConfig!: {
    algorithm: string;
    hyperparameters: Record<string, any>;
    features: string[];
    targetVariable: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  trainingMetrics!: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    auc?: number;
    confusionMatrix?: Record<string, number>;
    trainingTimeMs?: number;
    sampleCount?: number;
  } | null;

  @Column({ type: 'jsonb', nullable: true })
  validationMetrics!: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    auc?: number;
    confusionMatrix?: Record<string, number>;
  } | null;

  @Column({ type: 'text', nullable: true })
  modelPath!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  featureImportance!: Record<string, number> | null;

  @Column({ type: 'jsonb', nullable: true })
  trainingDataSummary!: {
    startDate?: Date;
    endDate?: Date;
    sampleCount: number;
    fraudCount: number;
    nonFraudCount: number;
    features: Array<{
      name: string;
      type: string;
      missingCount: number;
      uniqueCount: number;
    }>;
  } | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  trainedBy!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  trainedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  deployedAt!: Date | null;

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  minConfidenceThreshold!: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  holdThreshold!: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  algorithm!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  hyperparameters!: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
