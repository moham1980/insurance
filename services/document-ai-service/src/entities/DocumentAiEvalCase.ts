import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('document_ai_eval_cases')
@Index(['enabled', 'createdAt'])
@Index(['documentId'], { unique: true })
export class DocumentAiEvalCase {
  @PrimaryGeneratedColumn('uuid', { name: 'case_id' })
  caseId!: string;

  @Column({ name: 'name', type: 'text' })
  name!: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId!: string;

  @Column({ name: 'expected', type: 'jsonb' })
  expected!: any;

  @Column({ name: 'tags', type: 'text', array: true, nullable: true })
  tags!: string[] | null;

  @Column({ name: 'enabled', type: 'boolean', default: true })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
