import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type DeploymentMode = 'single_org' | 'multi_org' | 'saas' | 'federated_node';
export type DataIsolation = 'schema' | 'row' | 'database';
export type TenantStatus = 'active' | 'suspended';

@Entity('tenants')
@Index(['organizationId'])
@Index(['brandKey'], { unique: true, where: "\"brand_key\" IS NOT NULL" })
export class Tenant {
  @PrimaryGeneratedColumn('uuid', { name: 'tenant_id' })
  tenantId!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'deployment_mode', type: 'text', default: 'single_org' })
  deploymentMode!: DeploymentMode;

  @Column({ name: 'data_isolation', type: 'text', default: 'row' })
  dataIsolation!: DataIsolation;

  @Column({ name: 'primary_region', type: 'text' })
  primaryRegion!: string;

  @Column({ name: 'brand_key', type: 'text', nullable: true })
  brandKey!: string | null;

  @Column({ name: 'status', type: 'text', default: 'active' })
  status!: TenantStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
