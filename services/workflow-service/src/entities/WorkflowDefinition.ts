import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

@Entity('workflow_definitions')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'key'])
export class WorkflowDefinition {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  key!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'jsonb' })
  definition!: {
    nodes: Array<{
      id: string;
      type: 'start' | 'end' | 'task' | 'gateway' | 'event' | 'userTask' | 'timerEvent';
      name: string;
      config?: Record<string, any>;
    }>;
    edges: Array<{
      from: string;
      to: string;
      condition?: string;
    }>;
  };

  @Column({ type: 'enum', enum: WorkflowStatus, default: WorkflowStatus.DRAFT })
  status!: WorkflowStatus;

  @Column({ type: 'integer', default: 1 })
  version!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @Column({ type: 'text', array: true, default: [] })
  tags!: string[];

  @Column({ type: 'timestamp', nullable: true })
  activatedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  deactivatedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
