import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('regulatory_failure_log')
@Index(['createdAt'])
@Index(['correlationId'])
@Index(['tenantId', 'createdAt'])
@Index(['operation', 'upstream', 'createdAt'])
export class RegulatoryFailureLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'correlation_id', type: 'text', nullable: true })
  correlationId: string | null;

  @Column({ name: 'tenant_id', type: 'text', nullable: true })
  tenantId: string | null;

  @Column({ name: 'actor_user_id', type: 'text', nullable: true })
  actorUserId: string | null;

  @Column({ name: 'operation', type: 'text' })
  operation: string;

  @Column({ name: 'upstream', type: 'text', nullable: true })
  upstream: string | null;

  @Column({ name: 'error_code', type: 'text', nullable: true })
  errorCode: string | null;

  @Column({ name: 'http_status', type: 'int', nullable: true })
  httpStatus: number | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'error_stack', type: 'text', nullable: true })
  errorStack: string | null;

  @Column({ name: 'request_json', type: 'jsonb', nullable: true })
  requestJson: object | null;

  @Column({ name: 'response_json', type: 'jsonb', nullable: true })
  responseJson: object | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;
}
