import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Rule } from './rule.entity';

export enum RuleSetStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  DEPRECATED = 'deprecated',
}

@Entity('rule_sets')
export class RuleSet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  domain: string; // e.g., 'aml', 'fraud', 'underwriting'

  @Column({
    type: 'enum',
    enum: RuleSetStatus,
    default: RuleSetStatus.DRAFT,
  })
  status: RuleSetStatus;

  @Column({ nullable: true })
  effectiveFrom: Date;

  @Column({ nullable: true })
  effectiveTo: Date;

  @Column({ nullable: true })
  version: number;

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

  @OneToMany(() => Rule, rule => rule.ruleSet)
  rules: Rule[];
}
