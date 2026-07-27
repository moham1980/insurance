import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('workflow_templates')
@Index(['tenantId', 'category'])
export class WorkflowTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  category!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'jsonb' })
  definitionTemplate!: {
    nodes: Array<{
      id: string;
      type: 'start' | 'end' | 'task' | 'gateway' | 'event' | 'userTask' | 'timerEvent';
      name: string;
      config?: Record<string, any>;
    }>;
    edges: Array<{
      from: string;
      to: string;
      condition?: string;
    }>;
  };

  @Column({ type: 'text', array: true })
  variables!: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
