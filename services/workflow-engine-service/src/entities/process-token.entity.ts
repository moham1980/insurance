import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum TokenStatus {
  ACTIVE = 'active',
  CONSUMED = 'consumed',
  TERMINATED = 'terminated',
}

@Entity('process_tokens')
export class ProcessToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  tenantId: string;

  @Column()
  instanceId: string;

  @Column()
  @Index()
  nodeId: string; // Current node where token resides

  @Column({
    type: 'enum',
    enum: TokenStatus,
    default: TokenStatus.ACTIVE,
  })
  status: TokenStatus;

  @Column({ nullable: true })
  parentNodeId: string; // For tracking parallel execution

  @Column({ type: 'jsonb', nullable: true })
  scope: Record<string, any>; // Token-specific scope

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  consumedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
