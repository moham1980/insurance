import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

/**
 * P1 #10: Immutable entity version snapshot for notification templates.
 */
@Entity({ name: 'notification_entity_version' })
@Index(['resourceType', 'resourceId'])
@Index(['resourceType', 'resourceId', 'version'])
export class EntityVersion {
  @PrimaryGeneratedColumn('uuid', { name: 'entity_version_id' })
  entityVersionId!: string;

  @Column({ name: 'resource_type', type: 'text' })
  resourceType!: string;

  @Column({ name: 'resource_id', type: 'text' })
  resourceId!: string;

  @Column({ type: 'integer' })
  version!: number;

  @Column({ type: 'jsonb' })
  snapshot!: Record<string, any>;

  @Column({ type: 'text' })
  actor!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;
}
