import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { RuleSet } from './rule-set.entity';

export enum EvaluationResult {
  MATCHED = 'matched',
  NOT_MATCHED = 'not_matched',
  ERROR = 'error',
}

@Entity('rule_audit')
export class RuleAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ruleSetId: string;

  @ManyToOne(() => RuleSet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rule_set_id' })
  ruleSet: RuleSet;

  @Column({ nullable: true })
  ruleId: string;

  @Column({ type: 'jsonb' })
  input: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  firedRules: string[];

  @Column({ type: 'jsonb', nullable: true })
  actions: Record<string, any>;

  @Column({
    type: 'enum',
    enum: EvaluationResult,
  })
  result: EvaluationResult;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'int', default: 0 })
  executionTime: number; // in milliseconds

  @CreateDateColumn()
  timestamp: Date;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  correlationId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
