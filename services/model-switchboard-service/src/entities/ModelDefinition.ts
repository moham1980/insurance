import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum ModelType {
  OCR = 'ocr',
  NLP = 'nlp',
  FRAUD_DETECTION = 'fraud_detection',
  RISK_SCORING = 'risk_scoring',
  CLASSIFICATION = 'classification',
}

export enum ModelStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  DEPRECATED = 'deprecated',
  RETIRED = 'retired',
}

@Entity('model_definitions')
@Index(['tenantId', 'status'])
@Index(['modelType'])
export class ModelDefinition {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  modelKey!: string;

  @Column({ type: 'enum', enum: ModelType })
  modelType!: ModelType;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'jsonb' })
  config!: {
    endpoint?: string;
    provider?: string;
    version?: string;
    parameters?: Record<string, any>;
    capabilities?: string[];
  };

  @Column({ type: 'integer', default: 0 })
  priority!: number;

  @Column({ type: 'enum', enum: ModelStatus, default: ModelStatus.DRAFT })
  status!: ModelStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
