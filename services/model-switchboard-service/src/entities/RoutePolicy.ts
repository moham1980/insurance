import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum RoutingStrategy {
  COST_OPTIMIZED = 'cost_optimized',
  QUALITY_OPTIMIZED = 'quality_optimized',
  LATENCY_OPTIMIZED = 'latency_optimized',
  BALANCED = 'balanced',
}

@Entity('route_policies')
export class RoutePolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  capability: string; // summarization, extraction, embedding, fraud_scoring, etc.

  @Column({ nullable: true })
  tenantId: string; // '*' for default policy

  @Column()
  primaryModel: string; // modelId

  @Column({ type: 'jsonb', default: '[]' })
  fallbackChain: string[]; // array of modelIds

  @Column({ type: 'int', nullable: true })
  qualityThreshold: number; // min quality score (0-100)

  @Column({ type: 'int', nullable: true })
  costBudgetPerDay: number; // in micro-cents or tokens

  @Column({
    type: 'enum',
    enum: RoutingStrategy,
    default: RoutingStrategy.BALANCED,
  })
  routingStrategy: RoutingStrategy;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  createdBy: string;

  @Column({ nullable: true })
  updatedBy: string;
}
