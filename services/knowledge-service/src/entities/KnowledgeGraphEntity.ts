import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum EntityType {
  CONCEPT = 'concept',
  POLICY = 'policy',
  PERSON = 'person',
  ORGANIZATION = 'organization',
  LOCATION = 'location',
  PRODUCT = 'product',
  DOCUMENT = 'document',
  EVENT = 'event',
}

@Entity('knowledge_graph_entities')
@Index(['tenantId', 'entityType'])
@Index(['tenantId', 'name'])
export class KnowledgeGraphEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  entityType!: EntityType;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', array: true, default: [] })
  aliases!: string[];

  @Column({ type: 'jsonb', nullable: true })
  properties!: Record<string, any> | null;

  @Column({ type: 'float', array: true, nullable: true })
  embedding!: number[] | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  embeddingModel!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
