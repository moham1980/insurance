import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum InvocationStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
}

@Entity('model_invocations')
@Index(['modelKey', 'businessKey'])
@Index(['invokedAt'])
export class ModelInvocation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 50 })
  modelKey!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  businessKey!: string | null;

  @Column({ type: 'jsonb' })
  input!: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  output!: Record<string, any> | null;

  @Column({ type: 'enum', enum: InvocationStatus })
  status!: InvocationStatus;

  @Column({ type: 'jsonb', nullable: true })
  error!: {
    message: string;
    code?: string;
  } | null;

  @Column({ type: 'integer' })
  latencyMs!: number;

  @Column({ type: 'timestamp' })
  invokedAt!: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
