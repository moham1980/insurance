import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

/**
 * P1 #10: Immutable entity version snapshot for feature flags.
 * Each row stores a full snapshot of the entity at a specific version.
 * This enables point-in-time recovery and full audit history.
 */
@Entity({ name: 'feature_flag_entity_version' })
@Index(['resourceType', 'resourceId'])
@Index(['resourceType', 'resourceId', 'version'])
export class EntityVersion {
  @PrimaryGeneratedColumn('uuid', { name: 'entity_version_id' })
  entityVersionId!: string;

  @Column({ name: 'resource_type', type: 'text' })
  resourceType!: string; // e.g. 'feature_flag'

  @Column({ name: 'resource_id', type: 'text' })
  resourceId!: string; // e.g. flag name

  @Column({ type: 'integer' })
  version!: number; // monotonically increasing per resource

  @Column({ type: 'jsonb' })
  snapshot!: Record<string, any>; // full entity snapshot

  @Column({ type: 'text' })
  actor!: string; // who created this version

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;
}
