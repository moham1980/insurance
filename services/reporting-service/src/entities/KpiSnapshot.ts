import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('kpi_snapshots')
@Index(['kpiKey', 'periodStart', 'periodEnd'], { unique: true })
@Index(['kpiKey', 'createdAt'])
export class KpiSnapshot {
  @PrimaryGeneratedColumn('uuid', { name: 'snapshot_id' })
  snapshotId!: string;

  @Column({ name: 'kpi_key', type: 'text' })
  kpiKey!: string;

  @Column({ name: 'period_start', type: 'timestamptz' })
  periodStart!: Date;

  @Column({ name: 'period_end', type: 'timestamptz' })
  periodEnd!: Date;

  @Column({ name: 'value', type: 'numeric' })
  value!: number;

  @Column({ name: 'unit', type: 'text', nullable: true })
  unit!: string | null;

  @Column({ name: 'source_system', type: 'text', nullable: true })
  sourceSystem!: string | null;

  @Column({ name: 'period_granularity', type: 'text', nullable: true })
  periodGranularity!: string | null;

  @Column({ name: 'official_source_system', type: 'text', nullable: true })
  officialSourceSystem!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
