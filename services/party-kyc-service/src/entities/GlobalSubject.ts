import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('global_subjects')
@Index(['iamSubjectId'], { unique: true })
export class GlobalSubject {
  @PrimaryGeneratedColumn('uuid', { name: 'global_subject_id' })
  globalSubjectId!: string;

  @Column({ name: 'iam_subject_id', type: 'text' })
  iamSubjectId!: string;

  @Column({ name: 'assurance_level', type: 'text', default: 'low' })
  assuranceLevel!: 'low' | 'substantial' | 'high';

  @Column({ name: 'status', type: 'text', default: 'active' })
  status!: 'active' | 'suspended' | 'deleted';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
