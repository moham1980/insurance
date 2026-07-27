import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('rule_templates')
@Index(['tenantId', 'category'])
export class RuleTemplate {
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

  @Column({ type: 'text' })
  conditionTemplate!: string;

  @Column({ type: 'jsonb', nullable: true })
  actionTemplate!: {
    type: 'return' | 'set' | 'add' | 'multiply' | 'push' | 'call' | 'emit' | 'log';
    value?: any;
    target?: string;
    service?: string;
    method?: string;
    params?: Record<string, any>;
    event?: string;
    payload?: any;
    message?: string;
  } | null;

  @Column({ type: 'text', array: true })
  variables!: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
