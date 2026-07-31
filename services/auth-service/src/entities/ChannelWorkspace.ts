import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ChannelType =
  | 'web'
  | 'mobile_app'
  | 'call_center'
  | 'branch'
  | 'agent_portal'
  | 'broker_portal'
  | 'insurer_portal';

export type WorkspaceStatus = 'active' | 'suspended';

@Entity('channel_workspaces')
@Index(['tenantId', 'status'])
@Index(['organizationId', 'status'])
@Index(['brandKey'], { unique: true, where: '"brand_key" IS NOT NULL' })
export class ChannelWorkspace {
  @PrimaryGeneratedColumn('uuid', { name: 'workspace_id' })
  workspaceId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'channel_type', type: 'text' })
  channelType!: ChannelType;

  @Column({ name: 'brand_key', type: 'text' })
  brandKey!: string;

  @Column({ name: 'domain', type: 'text', nullable: true })
  domain!: string | null;

  @Column({ name: 'allowed_capabilities', type: 'text', array: true, default: () => "ARRAY[]::text[]" })
  allowedCapabilities!: string[];

  @Column({ name: 'status', type: 'text', default: 'active' })
  status!: WorkspaceStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
