import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum RuleStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum RuleType {
  CONDITION = 'condition',
  CALCULATION = 'calculation',
  VALIDATION = 'validation',
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

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
