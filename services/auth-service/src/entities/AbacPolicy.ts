import { Entity, PrimaryColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('abac_policies')
export class AbacPolicy {
  @PrimaryColumn('varchar', { name: 'id', length: 64 })
  id: string;

  @Column('varchar', { name: 'name', length: 255 })
  name: string;

  @Column('text', { name: 'description', nullable: true })
  description: string | null;

  @Column('varchar', { name: 'effect', length: 10, default: 'allow' })
  effect: 'allow' | 'deny';

  @Column('jsonb', { name: 'conditions' })
  conditions: Array<{
    attribute: string;
    operator: string;
    value: any;
  }>;

  @Index()
  @Column('int', { name: 'priority', default: 0 })
  priority: number;

  @Index()
  @Column('boolean', { name: 'enabled', default: true })
  enabled: boolean;

  @Column('varchar', { name: 'status', length: 50, default: 'active' })
  status: 'active' | 'draft' | 'deprecated';

  @Column('varchar', { name: 'created_by', length: 128, nullable: true })
  createdBy: string | null;

  @Column('varchar', { name: 'updated_by', length: 128, nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
