import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type DocumentAiEvalRunStatus = 'queued' | 'running' | 'completed' | 'failed';

@Entity('document_ai_eval_runs')
@Index(['status', 'createdAt'])
export class DocumentAiEvalRun {
  @PrimaryGeneratedColumn('uuid', { name: 'run_id' })
  runId!: string;

  @Column({ name: 'status', type: 'text', default: 'queued' })
  status!: DocumentAiEvalRunStatus;

  @Column({ name: 'params', type: 'jsonb', nullable: true })
  params!: any | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'error_stack', type: 'text', nullable: true })
  errorStack!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt!: Date | null;
}
