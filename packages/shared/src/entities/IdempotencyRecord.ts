import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('idempotency_records')
@Index(['requestHash'])
@Index(['tenantId', 'createdAt'])
@Index(['expiresAt'])
export class IdempotencyRecord {
  @PrimaryGeneratedColumn('uuid', { name: 'idempotency_id' })
  idempotencyId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ name: 'request_hash', type: 'text', unique: true })
  requestHash!: string;

  @Column({ name: 'payload_hash', type: 'text' })
  payloadHash!: string;

  @Column({ name: 'response_payload', type: 'jsonb' })
  responsePayload!: Record<string, unknown>;

  @Column({ name: 'status_code', type: 'int' })
  statusCode!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;
}
