import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_ai_eval_results')
@Index(['runId', 'createdAt'])
@Index(['caseId', 'createdAt'])
export class DocumentAiEvalResult {
  @PrimaryGeneratedColumn('uuid', { name: 'result_id' })
  resultId!: string;

  @Column({ name: 'run_id', type: 'uuid' })
  runId!: string;

  @Column({ name: 'case_id', type: 'uuid' })
  caseId!: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId!: string;

  @Column({ name: 'expected', type: 'jsonb', nullable: true })
  expected!: any | null;

  @Column({ name: 'actual', type: 'jsonb', nullable: true })
  actual!: any | null;

  @Column({ name: 'score', type: 'numeric', precision: 6, scale: 4, nullable: true })
  score!: string | null;

  @Column({ name: 'diff', type: 'jsonb', nullable: true })
  diff!: any | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'error_stack', type: 'text', nullable: true })
  errorStack!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
