import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type OrganizationUnitType =
  | 'insurer'
  | 'head_office'
  | 'branch'
  | 'agency'
  | 'brokerage'
  | 'repair_shop'
  | 'hospital'
  | 'expert'
  | 'call_center';

@Entity('org_units')
@Index(['code'], { unique: true })
@Index(['parentOrgUnitId'])
export class OrganizationUnit {
  @PrimaryGeneratedColumn('uuid', { name: 'org_unit_id' })
  orgUnitId!: string;

  @Column({ name: 'type', type: 'text' })
  type!: OrganizationUnitType;

  @Column({ name: 'name', type: 'text' })
  name!: string;

  @Column({ name: 'code', type: 'text' })
  code!: string;

  @Column({ name: 'parent_org_unit_id', type: 'uuid', nullable: true })
  parentOrgUnitId!: string | null;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
