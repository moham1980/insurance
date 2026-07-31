import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type SalesNetworkRoleType = 'AGENT' | 'SUB_AGENT' | 'MARKETER' | 'BROKER_STAFF' | 'ADJUSTER';
export type SalesNetworkMembershipStatus = 'pending' | 'active' | 'suspended' | 'terminated';

@Entity('sales_network_memberships')
@Index(['organizationId', 'tenantId', 'partyId'])
@Index(['parentPartyId'])
@Index(['carrierOrganizationId', 'status'])
export class SalesNetworkMembership {
  @PrimaryGeneratedColumn('uuid', { name: 'membership_id' })
  membershipId!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'party_id', type: 'uuid' })
  partyId!: string;

  @Column({ name: 'parent_party_id', type: 'uuid', nullable: true })
  parentPartyId!: string | null;

  @Column({ name: 'role_type', type: 'text' })
  roleType!: SalesNetworkRoleType;

  @Column({ name: 'carrier_organization_id', type: 'uuid', nullable: true })
  carrierOrganizationId!: string | null;

  @Column({ name: 'scope', type: 'text', array: true, default: () => "ARRAY[]::text[]" })
  scope!: string[];

  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionRate!: number | null;

  @Column({ name: 'commission_split', type: 'jsonb', nullable: true })
  commissionSplit!: {
    selfRate: number;
    parentRate: number;
    carrierRate: number;
    rules?: Record<string, any>;
  } | null;

  @Column({ name: 'valid_from', type: 'timestamptz' })
  validFrom!: Date;

  @Column({ name: 'valid_to', type: 'timestamptz', nullable: true })
  validTo!: Date | null;

  @Column({ name: 'status', type: 'text', default: 'pending' })
  status!: SalesNetworkMembershipStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
