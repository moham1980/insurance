import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum InstanceStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended',
  WAITING = 'waiting',
}

@Entity('workflow_instances')
@Index(['workflowDefinitionId', 'status'])
@Index(['businessKey'])
@Index(['parentInstanceId'])
export class WorkflowInstance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  workflowDefinitionId!: string;

  @Column({ type: 'varchar', length: 50 })
  workflowKey!: string;

  @Column({ type: 'integer' })
  workflowVersion!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  businessKey!: string | null;

  @Column({ type: 'uuid', nullable: true })
  parentInstanceId!: string | null;

  @Column({ type: 'enum', enum: InstanceStatus, default: InstanceStatus.RUNNING })
  status!: InstanceStatus;

  @Column({ type: 'jsonb' })
  variables!: Record<string, any>;

  @Column({ type: 'jsonb' })
  currentNode!: {
    nodeId: string;
    nodeName: string;
    enteredAt: Date;
    assignee?: string | null;
    candidateUsers?: string[];
    candidateGroups?: string[];
    dueDate?: Date | null;
    completedBy?: string | null;
    completedAt?: Date | null;
    branches?: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  history!: Array<{
    nodeId: string;
    nodeName: string;
    enteredAt: Date;
    exitedAt?: Date;
    status: InstanceStatus;
    completedBy?: string | null;
  }> | null;

  @Column({ type: 'jsonb', nullable: true })
  error!: {
    message: string;
    nodeId?: string;
    occurredAt?: Date;
  } | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @Column({ type: 'uuid', nullable: true })
  initiatorUserId!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
