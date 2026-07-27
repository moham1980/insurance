import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

export type CoverageStatus = 'draft' | 'active' | 'archived';

@Entity({ name: 'coverages' })
@Index(['tenantId'])
@Index(['productId'])
@Index(['tenantId', 'productId', 'code'], { unique: true })
export class Coverage {
  @PrimaryColumn('uuid', { name: 'coverage_id' })
  coverageId!: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId!: string;

  @Column('uuid', { name: 'product_id' })
  productId!: string;

  @Column({ name: 'code', type: 'varchar', length: 64 })
  code!: string;

  @Column({ name: 'name_fa', type: 'varchar', length: 256 })
  nameFa!: string;

  @Column({ name: 'status', type: 'varchar', length: 32 })
  status!: CoverageStatus;

  @Column({ name: 'terms', type: 'jsonb', nullable: true })
  terms!: any | null;

  @Column({ name: 'created_by', type: 'varchar', length: 128, nullable: true })
  createdBy!: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
