import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('kpi_ingestion_audit')
@Index(['idempotencyKey'], { unique: true })
@Index(['kpiKey', 'createdAt'])
export class KpiIngestionAudit {
  @PrimaryGeneratedColumn('uuid', { name: 'audit_id' })
  auditId!: string;

  @Column({ name: 'idempotency_key', type: 'text' })
  idempotencyKey!: string;

  @Column({ name: 'correlation_id', type: 'text', nullable: true })
  correlationId!: string | null;

  @Column({ name: 'tenant_id', type: 'text', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'actor_user_id', type: 'text', nullable: true })
  actorUserId!: string | null;

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

  @Column({ name: 'payload', type: 'jsonb' })
  payload!: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
