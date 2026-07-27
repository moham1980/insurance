import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

export type DeductibleStatus = 'draft' | 'active' | 'archived';

@Entity({ name: 'deductibles' })
@Index(['tenantId'])
@Index(['productId'])
@Index(['tenantId', 'productId', 'code'], { unique: true })
export class Deductible {
  @PrimaryColumn('uuid', { name: 'deductible_id' })
  deductibleId!: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId!: string;

  @Column('uuid', { name: 'product_id' })
  productId!: string;

  @Column({ name: 'code', type: 'varchar', length: 64 })
  code!: string;

  @Column({ name: 'name_fa', type: 'varchar', length: 256 })
  nameFa!: string;

  @Column({ name: 'kind', type: 'varchar', length: 32 })
  kind!: 'fixed_amount' | 'percent';

  @Column({ name: 'value', type: 'numeric', precision: 18, scale: 6 })
  value!: string;

  @Column({ name: 'status', type: 'varchar', length: 32 })
  status!: DeductibleStatus;

  @Column({ name: 'created_by', type: 'varchar', length: 128, nullable: true })
  createdBy!: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
