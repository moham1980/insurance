import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ModelType = 'llm' | 'ml' | 'ocr' | 'embedding' | 'other';
export type ModelStatus = 'development' | 'testing' | 'staging' | 'production' | 'deprecated' | 'retired';
export type ModelRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type PiiHandling = 'redact' | 'anonymize' | 'forbidden';
export type ApprovalStatus = 'draft' | 'approved' | 'retired';

export type RiskAssessmentStatus = 'pending' | 'approved' | 'rejected' | 'needs_review';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed';

export type ValidationStatus = 'pending' | 'in_progress' | 'passed' | 'failed';

@Entity('model_card')
@Index(['modelId', 'version'])
@Index(['tenantId', 'approvalStatus'])
export class ModelCard {
  @PrimaryGeneratedColumn('uuid', { name: 'card_id' })
  cardId!: string;

  @Column({ name: 'tenant_id', type: 'text', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'model_id', type: 'uuid' })
  modelId!: string;

  @Column({ name: 'version', type: 'text' })
  version!: string;

  @Column({ name: 'purpose', type: 'text', nullable: true })
  purpose!: string | null;

  @Column({ name: 'owner', type: 'text', nullable: true })
  owner!: string | null;

  @Column({ name: 'model_details', type: 'jsonb', nullable: true })
  modelDetails!: object | null;

  @Column({ name: 'intended_use', type: 'text', nullable: true })
  intendedUse!: string | null;

  @Column({ name: 'limitations', type: 'text', nullable: true })
  limitations!: string | null;

  @Column({ name: 'training_data', type: 'jsonb', nullable: true })
  trainingData!: object | null;

  @Column({ name: 'bias_risks', type: 'jsonb', nullable: true })
  biasRisks!: string[] | null;

  @Column({ name: 'allowed_data_types', type: 'jsonb', nullable: true })
  allowedDataTypes!: string[] | null;

  @Column({ name: 'pii_handling', type: 'text', default: 'redact' })
  piiHandling!: PiiHandling;

  @Column({ name: 'approval_status', type: 'text', default: 'draft' })
  approvalStatus!: ApprovalStatus;

  @Column({ name: 'evaluation_metrics', type: 'jsonb', nullable: true })
  evaluationMetrics!: object | null;

  @Column({ name: 'performance_metrics', type: 'jsonb', nullable: true })
  performanceMetrics!: object | null;

  @Column({ name: 'ethical_considerations', type: 'text', nullable: true })
  ethicalConsiderations!: string | null;

  @Column({ name: 'citations', type: 'jsonb', nullable: true })
  citations!: object | null;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('model_validation_report')
@Index(['modelId', 'createdAt'])
@Index(['status', 'createdAt'])
export class ModelValidationReport {
  @PrimaryGeneratedColumn('uuid', { name: 'report_id' })
  reportId!: string;

  @Column({ name: 'model_id', type: 'uuid' })
  modelId!: string;

  @Column({ name: 'version', type: 'text' })
  version!: string;

  @Column({ name: 'validation_type', type: 'text' })
  validationType!: string;

  @Column({ name: 'status', type: 'text', default: 'pending' })
  status!: ValidationStatus;

  @Column({ name: 'test_results', type: 'jsonb', nullable: true })
  testResults!: object | null;

  @Column({ name: 'performance_metrics', type: 'jsonb', nullable: true })
  performanceMetrics!: object | null;

  @Column({ name: 'data_quality_metrics', type: 'jsonb', nullable: true })
  dataQualityMetrics!: object | null;

  @Column({ name: 'bias_fairness_metrics', type: 'jsonb', nullable: true })
  biasFairnessMetrics!: object | null;

  @Column({ name: 'compliance_check', type: 'jsonb', nullable: true })
  complianceCheck!: object | null;

  @Column({ name: 'recommendations', type: 'text', nullable: true })
  recommendations!: string | null;

  @Column({ name: 'validated_by', type: 'text', nullable: true })
  validatedBy!: string | null;

  @Column({ name: 'validation_date', type: 'timestamptz', nullable: true })
  validationDate!: Date | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: object | null;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('model_risk_assessment')
@Index(['modelId', 'createdAt'])
@Index(['status', 'createdAt'])
export class ModelRiskAssessment {
  @PrimaryGeneratedColumn('uuid', { name: 'assessment_id' })
  assessmentId!: string;

  @Column({ name: 'model_id', type: 'uuid' })
  modelId!: string;

  @Column({ name: 'assessment_version', type: 'text' })
  assessmentVersion!: string;

  @Column({ name: 'status', type: 'text', default: 'pending' })
  status!: RiskAssessmentStatus;

  @Column({ name: 'assessor', type: 'text', nullable: true })
  assessor!: string | null;

  @Column({ name: 'risk_score', type: 'numeric', nullable: true })
  riskScore!: number | null;

  @Column({ name: 'risk_factors', type: 'jsonb', nullable: true })
  riskFactors!: object | null;

  @Column({ name: 'mitigation_plan', type: 'text', nullable: true })
  mitigationPlan!: string | null;

  @Column({ name: 'approval_notes', type: 'text', nullable: true })
  approvalNotes!: string | null;

  @Column({ name: 'assessed_at', type: 'timestamptz', nullable: true })
  assessedAt!: Date | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: object | null;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('ai_incident_report')
@Index(['severity', 'status', 'createdAt'])
@Index(['modelId', 'createdAt'])
export class AIIncidentReport {
  @PrimaryGeneratedColumn('uuid', { name: 'incident_id' })
  incidentId!: string;

  @Column({ name: 'model_id', type: 'uuid', nullable: true })
  modelId!: string | null;

  @Column({ name: 'incident_type', type: 'text' })
  incidentType!: string;

  @Column({ name: 'description', type: 'text' })
  description!: string;

  @Column({ name: 'severity', type: 'text', default: 'medium' })
  severity!: IncidentSeverity;

  @Column({ name: 'status', type: 'text', default: 'open' })
  status!: IncidentStatus;

  @Column({ name: 'affected_systems', type: 'jsonb', nullable: true })
  affectedSystems!: object | null;

  @Column({ name: 'impact_summary', type: 'text', nullable: true })
  impactSummary!: string | null;

  @Column({ name: 'root_cause', type: 'text', nullable: true })
  rootCause!: string | null;

  @Column({ name: 'resolution', type: 'text', nullable: true })
  resolution!: string | null;

  @Column({ name: 'reported_by', type: 'text', nullable: true })
  reportedBy!: string | null;

  @Column({ name: 'investigated_by', type: 'text', nullable: true })
  investigatedBy!: string | null;

  @Column({ name: 'occurred_at', type: 'timestamptz', nullable: true })
  occurredAt!: Date | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: object | null;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
