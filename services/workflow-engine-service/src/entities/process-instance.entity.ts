import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { ProcessDefinition } from './process-definition.entity';

export enum ProcessInstanceStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended',
}

@Entity('process_instances')
@Unique(['tenantId', 'businessKey'])
export class ProcessInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  tenantId: string;

  @Column()
  definitionId: string;

  @ManyToOne(() => ProcessDefinition, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'definition_id' })
  definition: ProcessDefinition;

  @Column()
  @Index()
  businessKey: string; // External reference (e.g., claimId, policyId)

  @Column({
    type: 'enum',
    enum: ProcessInstanceStatus,
    default: ProcessInstanceStatus.RUNNING,
  })
  status: ProcessInstanceStatus;

  @Column({ type: 'jsonb', nullable: true })
  context: Record<string, any>; // Runtime variables

  @Column({ nullable: true })
  currentNode: string; // Current active node

  @Column({ type: 'jsonb', nullable: true })
  error: {
    message: string;
    code?: string;
    details?: any;
    timestamp: Date;
  };

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  cancelledAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  startedBy: string;

  @Column({ nullable: true })
  cancelledBy: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

}
