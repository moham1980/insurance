import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Unique, Index } from 'typeorm';
import { ProcessInstance } from './process-instance.entity';

export enum ProcessDefinitionStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  DEPRECATED = 'deprecated',
}

export interface ProcessNode {
  id: string;
  type: 'start' | 'end' | 'api_call' | 'decision' | 'human_task' | 'timer' | 'parallel' | 'event_wait' | 'transform';
  name: string;
  config: Record<string, any>;
  position?: { x: number; y: number };
}

export interface ProcessEdge {
  id: string;
  from: string;
  to: string;
  condition?: string; // Expression for decision routing
  label?: string;
}

export interface ProcessGraph {
  nodes: ProcessNode[];
  edges: ProcessEdge[];
}

@Entity('process_definitions')
@Unique(['tenantId', 'key', 'version'])
@Unique(['tenantId', 'key', 'status'])
export class ProcessDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  tenantId: string;

  @Column()
  @Index()
  key: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  graph: ProcessGraph;

  @Column({
    type: 'enum',
    enum: ProcessDefinitionStatus,
    default: ProcessDefinitionStatus.DRAFT,
  })
  status: ProcessDefinitionStatus;

  @Column({ type: 'jsonb', nullable: true })
  variables: Record<string, any>; // Default variables

  @Column({ nullable: true })
  version: number;

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

  @Column({ nullable: true })
  deletedAt: Date;

  @OneToMany(() => ProcessInstance, instance => instance.definition)
  instances: ProcessInstance[];
}
