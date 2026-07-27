import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

export type ProductStatus = 'draft' | 'active' | 'archived';

@Entity({ name: 'products' })
@Index(['tenantId', 'code'], { unique: true })
export class Product {
  @PrimaryColumn('uuid', { name: 'product_id' })
  productId!: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId!: string;

  @Column({ name: 'code', type: 'varchar', length: 64 })
  code!: string;

  @Column({ name: 'name_fa', type: 'varchar', length: 256 })
  nameFa!: string;

  @Column({ name: 'name_en', type: 'varchar', length: 256, nullable: true })
  nameEn!: string | null;

  @Column({ name: 'line_of_business', type: 'varchar', length: 64 })
  lineOfBusiness!: string;

  @Column({ name: 'status', type: 'varchar', length: 32 })
  status!: ProductStatus;

  @Column({ name: 'version', type: 'int', default: 1 })
  version!: number;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: any | null;

  @Column({ name: 'created_by', type: 'varchar', length: 128, nullable: true })
  createdBy!: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
