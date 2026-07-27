import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum RelationshipType {
  RELATED_TO = 'related_to',
  PART_OF = 'part_of',
  INSTANCE_OF = 'instance_of',
  CAUSES = 'causes',
  CAUSED_BY = 'caused_by',
  LOCATED_IN = 'located_in',
  WORKS_FOR = 'works_for',
  OWNS = 'owns',
  BELONGS_TO = 'belongs_to',
  REFERENCES = 'references',
  DEFINED_BY = 'defined_by',
  DERIVED_FROM = 'derived_from',
  SIMILAR_TO = 'similar_to',
  CONNECTED_TO = 'connected_to',
}

@Entity('knowledge_graph_relationships')
@Index(['tenantId', 'sourceEntityId'])
@Index(['tenantId', 'targetEntityId'])
@Index(['tenantId', 'relationshipType'])
export class KnowledgeGraphRelationship {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  sourceEntityId!: string;

  @Column({ type: 'uuid' })
  targetEntityId!: string;

  @Column({ type: 'enum', enum: RelationshipType })
  relationshipType!: RelationshipType;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight!: number | null;

  @Column({ type: 'jsonb', nullable: true })
  properties!: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
