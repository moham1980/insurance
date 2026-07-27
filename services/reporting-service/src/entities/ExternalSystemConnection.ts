import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ExternalSystemType = 'financial' | 'bi' | 'data_warehouse' | 'analytics';
export type ConnectionStatus = 'active' | 'inactive' | 'error' | 'syncing';

@Entity('external_system_connections')
@Index(['systemType', 'status'])
@Index(['status', 'lastSyncAt'])
export class ExternalSystemConnection {
  @Column({ type: 'uuid', name: 'tenant_id', nullable: true })
  tenantId?: string | null;

  @PrimaryGeneratedColumn('uuid', { name: 'connection_id' })
  connectionId!: string;

  @Column({ name: 'system_name', type: 'text' })
  systemName!: string;

  @Column({ name: 'system_type', type: 'text' })
  systemType!: ExternalSystemType;

  @Column({ name: 'connection_config', type: 'jsonb', nullable: true })
  connectionConfig!: any | null;

  @Column({ name: 'status', type: 'text', default: 'inactive' })
  status!: ConnectionStatus;

  @Column({ name: 'last_sync_at', type: 'timestamptz', nullable: true })
  lastSyncAt!: Date | null;

  @Column({ name: 'last_sync_status', type: 'text', nullable: true })
  lastSyncStatus!: string | null;

  @Column({ name: 'last_sync_error', type: 'text', nullable: true })
  lastSyncError!: string | null;

  @Column({ name: 'sync_frequency_minutes', type: 'int', nullable: true })
  syncFrequencyMinutes!: number | null;

  @Column({ name: 'enabled_data_types', type: 'jsonb', nullable: true })
  enabledDataTypes!: string[] | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: object | null;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
