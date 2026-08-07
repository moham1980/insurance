import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

/**
 * P1 #10: Immutable entity version snapshot for workflow definitions.
 */
@Entity('workflow_entity_version')
@Index(['resourceType', 'resourceId'])
@Index(['resourceType', 'resourceId', 'version'])
export class EntityVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

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

  @Column({ name: 'tenant_id', type: 'text', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;
}
