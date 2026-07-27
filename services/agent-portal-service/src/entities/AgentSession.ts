import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

@Entity('agent_sessions')
@Index(['agentId', 'status'])
export class AgentSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  agentId!: string;

  @Column({ type: 'varchar', length: 255 })
  jwtToken!: string;

  @Column({ type: 'enum', enum: SessionStatus, default: SessionStatus.ACTIVE })
  status!: SessionStatus;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
