import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

@Entity('data_lineage_events')
@Index(['sourceSystem', 'sourceEntity', 'sourceEntityId'])
@Index(['targetSystem', 'targetEntity', 'targetEntityId'])
@Index(['tenantId'])
@Index(['operation'])
@Index(['timestamp'])
export class LineageEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ name: 'timestamp', type: 'timestamptz' })
  timestamp!: Date;

  @Column({ name: 'source_system', type: 'text' })
  sourceSystem!: string;

  @Column({ name: 'source_entity', type: 'text' })
  sourceEntity!: string;

  @Column({ name: 'source_entity_id', type: 'text' })
  sourceEntityId!: string;

  @Column({ name: 'operation', type: 'text' })
  operation!: 'create' | 'read' | 'update' | 'delete' | 'transform' | 'export' | 'import';

  @Column({ name: 'target_system', type: 'text', nullable: true })
  targetSystem?: string | null;

  @Column({ name: 'target_entity', type: 'text', nullable: true })
  targetEntity?: string | null;

  @Column({ name: 'target_entity_id', type: 'text', nullable: true })
  targetEntityId?: string | null;

  @Column({ name: 'transformation', type: 'text', nullable: true })
  transformation?: string | null;

  @Column({ name: 'user_id', type: 'text', nullable: true })
  userId?: string | null;

  @Column({ name: 'tenant_id', type: 'text', nullable: true })
  tenantId?: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;
}
