import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type OrganizationCapabilityType = 'CARRIER' | 'BROKER' | 'MGA' | 'AGENCY' | 'AGGREGATOR' | 'LOSS_ADJUSTER' | 'SERVICE_PROVIDER';
export type OrganizationCapabilityStatus = 'active' | 'suspended';

@Entity('organization_capabilities')
@Index(['organizationId', 'tenantId', 'capability', 'status'])
@Index(['tenantId', 'capability', 'status'])
export class OrganizationCapability {
  @PrimaryGeneratedColumn('uuid', { name: 'capability_id' })
  capabilityId!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'capability', type: 'text' })
  capability!: OrganizationCapabilityType;

  @Column({ name: 'scope', type: 'text', array: true, default: () => "ARRAY[]::text[]" })
  scope!: string[];

  @Column({ name: 'binding_authority_profile_id', type: 'uuid', nullable: true })
  bindingAuthorityProfileId!: string | null;

  @Column({ name: 'effective_from', type: 'timestamptz' })
  effectiveFrom!: Date;

  @Column({ name: 'effective_to', type: 'timestamptz', nullable: true })
  effectiveTo!: Date | null;

  @Column({ name: 'status', type: 'text', default: 'active' })
  status!: OrganizationCapabilityStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
