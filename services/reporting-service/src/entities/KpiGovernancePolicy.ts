import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('kpi_governance_policies')
export class KpiGovernancePolicy {
  @PrimaryColumn({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @PrimaryColumn({ name: 'kpi_key', type: 'text' })
  kpiKey!: string;

  @Column({ name: 'allowed_period_granularities', type: 'text', array: true, default: '{}' })
  allowedPeriodGranularities!: string[];

  @Column({ name: 'allowed_source_systems', type: 'text', array: true, default: '{}' })
  allowedSourceSystems!: string[];

  @Column({ name: 'expected_unit', type: 'text', nullable: true })
  expectedUnit!: string | null;

  @Column({ name: 'min_value', type: 'numeric', nullable: true })
  minValue!: number | null;

  @Column({ name: 'max_value', type: 'numeric', nullable: true })
  maxValue!: number | null;

  @Column({ name: 'enforced', type: 'boolean', default: true })
  enforced!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
