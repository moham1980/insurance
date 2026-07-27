import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ProcessInstance } from './process-instance.entity';

@Entity('process_variables')
export class ProcessVariable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  tenantId: string;

  @Column()
  instanceId: string;

  @ManyToOne(() => ProcessInstance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instance_id' })
  instance: ProcessInstance;

  @Column()
  name: string;

  @Column({ type: 'text' })
  value: string; // JSON stringified value

  @Column({ type: 'text' })
  type: string; // string, number, boolean, object, array

  @Column({ nullable: true })
  scope: string; // global, local, token-specific

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
