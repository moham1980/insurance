import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

export type ProductVersionStatus = 'draft' | 'active' | 'archived';

@Entity({ name: 'product_versions' })
@Index(['tenantId'])
@Index(['productId'])
@Index(['tenantId', 'productId', 'version'], { unique: true })
export class ProductVersion {
  @PrimaryColumn('uuid', { name: 'product_version_id' })
  productVersionId!: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId!: string;

  @Column('uuid', { name: 'product_id' })
  productId!: string;

  @Column({ name: 'code', type: 'varchar', length: 64 })
  code!: string;

  @Column({ name: 'name_fa', type: 'varchar', length: 256 })
  nameFa!: string;

  @Column({ name: 'name_en', type: 'varchar', length: 256, nullable: true })
  nameEn!: string | null;

  @Column({ name: 'line_of_business', type: 'varchar', length: 64 })
  lineOfBusiness!: string;

  @Column({ name: 'status', type: 'varchar', length: 32 })
  status!: ProductVersionStatus;

  @Column({ name: 'version', type: 'int' })
  version!: number;

  @Column({ name: 'change_reason', type: 'text', nullable: true })
  changeReason!: string | null;

  @Column({ name: 'changed_by', type: 'varchar', length: 128, nullable: true })
  changedBy!: string | null;

  @Column({ name: 'snapshot', type: 'jsonb', nullable: true })
  snapshot!: any | null;

  @Column({ name: 'effective_date', type: 'timestamptz', nullable: true })
  effectiveDate!: Date | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
