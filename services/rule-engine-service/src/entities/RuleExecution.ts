import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum ExecutionStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

@Entity('rule_executions')
@Index(['ruleSetKey', 'businessKey'])
@Index(['executedAt'])
export class RuleExecution {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 50 })
  ruleSetKey!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  businessKey!: string | null;

  @Column({ type: 'jsonb' })
  input!: Record<string, any>;

  @Column({ type: 'jsonb' })
  output!: Record<string, any>;

  @Column({ type: 'enum', enum: ExecutionStatus })
  status!: ExecutionStatus;

  @Column({ type: 'jsonb', nullable: true })
  matchedRules!: Array<{
    ruleId: string;
    ruleName: string;
    priority: number;
    version: number;
  }> | null;

  @Column({ type: 'jsonb', nullable: true })
  executionDetails!: Array<{
    ruleId: string;
    ruleName: string;
    condition: string;
    result: boolean;
  }> | null;

  @Column({ type: 'jsonb', nullable: true })
  error!: {
    message: string;
    ruleId?: string;
  } | null;

  @Column({ type: 'integer' })
  executionTimeMs!: number;

  @Column({ type: 'timestamp' })
  executedAt!: Date;

  @Column({ type: 'boolean', default: false })
  dryRun!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
