import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { RuleSet } from './rule-set.entity';

export enum ActionType {
  ALERT = 'alert',
  API_CALL = 'api_call',
  EVENT_PUBLISH = 'event_publish',
  STATUS_CHANGE = 'status_change',
  BLOCK = 'block',
}

export enum RulePriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
}

@Entity('rules')
export class Rule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ruleSetId: string;

  @ManyToOne(() => RuleSet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rule_set_id' })
  ruleSet: RuleSet;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text' })
  condition: string; // JSON expression

  @Column({
    type: 'enum',
    enum: ActionType,
  })
  action: ActionType;

  @Column({ type: 'jsonb', nullable: true })
  actionConfig: Record<string, any>;

  @Column({
    type: 'enum',
    enum: RulePriority,
    default: RulePriority.MEDIUM,
  })
  priority: RulePriority;

  @Column({ default: true })
  enabled: boolean;

  @Column({ nullable: true })
  effectiveFrom: Date;

  @Column({ nullable: true })
  effectiveTo: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  createdBy: string;

  @Column({ nullable: true })
  updatedBy: string;
}
