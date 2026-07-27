import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ExternalDataSourceType = 'suspicious_fund' | 'sanctions_list' | 'pep_list' | 'criminal_records';
export type ConnectionStatus = 'active' | 'inactive' | 'error' | 'syncing';

@Entity('external_data_sources')
@Index(['sourceType', 'status'])
@Index(['status', 'lastSyncAt'])
export class ExternalDataSource {
  @PrimaryGeneratedColumn('uuid', { name: 'source_id' })
  sourceId!: string;

  @Column({ name: 'source_name', type: 'text' })
  sourceName!: string;

  @Column({ name: 'source_type', type: 'text' })
  sourceType!: ExternalDataSourceType;

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

  @Column({ name: 'total_records_synced', type: 'int', default: 0 })
  totalRecordsSynced!: number;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: object | null;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
