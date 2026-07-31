import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

export type CoverageDefinitionStatus = 'draft' | 'active' | 'superseded' | 'retired';
export type CoverageDefinitionType = 'mandatory' | 'optional';

@Entity({ name: 'coverage_definitions' })
@Index(['tenantId'])
@Index(['productVersionId'])
@Index(['tenantId', 'productVersionId', 'code'], { unique: true })
export class CoverageDefinition {
  @PrimaryColumn('uuid', { name: 'coverage_definition_id' })
  coverageDefinitionId!: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId!: string;

  @Column('uuid', { name: 'product_version_id' })
  productVersionId!: string;

  @Column({ name: 'code', type: 'varchar', length: 64 })
  code!: string;

  @Column({ name: 'name_fa', type: 'varchar', length: 256 })
  nameFa!: string;

  @Column({ name: 'name_en', type: 'varchar', length: 256, nullable: true })
  nameEn!: string | null;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'type', type: 'varchar', length: 32 })
  type!: CoverageDefinitionType;

  @Column({ name: 'min_limit_amount_minor', type: 'numeric', precision: 24, scale: 0, nullable: true })
  minLimitAmountMinor!: string | null;

  @Column({ name: 'min_limit_currency', type: 'varchar', length: 8, nullable: true })
  minLimitCurrency!: string | null;

  @Column({ name: 'max_limit_amount_minor', type: 'numeric', precision: 24, scale: 0, nullable: true })
  maxLimitAmountMinor!: string | null;

  @Column({ name: 'max_limit_currency', type: 'varchar', length: 8, nullable: true })
  maxLimitCurrency!: string | null;

  @Column({ name: 'deductible_options', type: 'jsonb', nullable: true })
  deductibleOptions!: Record<string, any>[] | null;

  @Column({ name: 'default_selected', type: 'boolean', default: false })
  defaultSelected!: boolean;

  @Column({ name: 'status', type: 'varchar', length: 32 })
  status!: CoverageDefinitionStatus;

  @Column({ name: 'created_by', type: 'varchar', length: 128, nullable: true })
  createdBy!: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
