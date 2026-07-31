import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

export type RateTableAlgorithmType = 'table' | 'formula' | 'ml_model';
export type RateTableVersionStatus = 'draft' | 'active' | 'superseded' | 'retired';

@Entity({ name: 'rate_table_versions' })
@Index(['tenantId'])
@Index(['productVersionId'])
@Index(['tenantId', 'productVersionId', 'version'], { unique: true })
export class RateTableVersion {
  @PrimaryColumn('uuid', { name: 'rate_table_version_id' })
  rateTableVersionId!: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId!: string;

  @Column('uuid', { name: 'product_version_id' })
  productVersionId!: string;

  @Column({ name: 'version', type: 'int' })
  version!: number;

  @Column({ name: 'algorithm_type', type: 'varchar', length: 32 })
  algorithmType!: RateTableAlgorithmType;

  @Column({ name: 'parameters_schema', type: 'jsonb', nullable: true })
  parametersSchema!: Record<string, any> | null;

  @Column({ name: 'status', type: 'varchar', length: 32 })
  status!: RateTableVersionStatus;

  @Column({ name: 'created_by', type: 'varchar', length: 128, nullable: true })
  createdBy!: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
