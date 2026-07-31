import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ConnectorType = 'internal' | 'rest' | 'soap' | 'kafka' | 'manual';
export type ConnectorStatus = 'active' | 'inactive' | 'deprecated';

@Entity('connector_configs')
@Index(['tenantId'])
@Index(['carrierOrganizationId'])
@Index(['connectorType'])
@Index(['status'])
export class ConnectorConfig {
  @PrimaryGeneratedColumn('uuid', { name: 'connector_id' })
  connectorId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'carrier_organization_id', type: 'uuid' })
  carrierOrganizationId!: string;

  @Column({ name: 'name', type: 'text' })
  name!: string;

  @Column({ name: 'connector_type', type: 'text' })
  connectorType!: ConnectorType;

  @Column({ name: 'config', type: 'jsonb' })
  config!: Record<string, any>;

  @Column({ name: 'status', type: 'text', default: 'active' })
  status!: ConnectorStatus;

  @Column({ name: 'timeout_ms', type: 'int', default: 30000 })
  timeoutMs!: number;

  @Column({ name: 'retry_policy', type: 'jsonb', nullable: true })
  retryPolicy!: Record<string, any> | null;

  @Column({ name: 'circuit_breaker_config', type: 'jsonb', nullable: true })
  circuitBreakerConfig!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
