import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum RuleStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

export enum RuleType {
  CONDITION = 'condition',
  CALCULATION = 'calculation',
  VALIDATION = 'validation',
  BUSINESS = 'business',
  ROUTING = 'routing',
  PRICING = 'pricing',
  FRAUD = 'fraud',
  COMPLIANCE = 'compliance',
}

@Entity('rules')
@Index(['tenantId', 'status'])
@Index(['ruleSetKey'])
@Index(['tenantId', 'ruleSetKey', 'name'])
export class Rule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  ruleSetKey!: string;

  @Column({ type: 'enum', enum: RuleType })
  type!: RuleType;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'jsonb' })
  condition!: {
    expression: string;
    variables: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  action!: {
    type: 'return' | 'set' | 'add' | 'multiply' | 'push' | 'call' | 'emit' | 'log';
    value?: any;
    target?: string;
    service?: string;
    method?: string;
    params?: Record<string, any>;
    event?: string;
    payload?: any;
    message?: string;
    stopAfterFirstMatch?: boolean;
  } | null;

  @Column({ type: 'integer', default: 0 })
  priority!: number;

  @Column({ type: 'enum', enum: RuleStatus, default: RuleStatus.DRAFT })
  status!: RuleStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @Column({ type: 'integer', default: 1 })
  version!: number;

  @Column({ type: 'text', array: true, default: [] })
  tags!: string[];

  @Column({ type: 'uuid', nullable: true })
  templateId!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  activatedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  deactivatedAt!: Date | null;

  // P1 #5 (SoD): tracks who submitted the rule for approval.
  // The approver must be a different user (submitter != approver).
  @Column({ type: 'text', nullable: true })
  submittedBy!: string | null;

  @Column({ type: 'text', nullable: true })
  approvedBy!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
