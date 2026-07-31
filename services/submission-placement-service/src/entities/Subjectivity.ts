import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type SubjectivityStatus = 'pending' | 'fulfilled' | 'waived' | 'failed';

@Entity('subjectivities')
@Index(['placementId'])
@Index(['submissionId'])
export class Subjectivity {
  @PrimaryGeneratedColumn('uuid', { name: 'subjectivity_id' })
  subjectivityId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'placement_id', type: 'uuid', nullable: true })
  placementId!: string | null;

  @Column({ name: 'submission_id', type: 'uuid' })
  submissionId!: string;

  @Column({ name: 'kind', type: 'text' })
  kind!: 'document' | 'payment' | 'inspection' | 'underwriting' | 'other';

  @Column({ name: 'description', type: 'text' })
  description!: string;

  @Column({ name: 'required_by', type: 'text' })
  requiredBy!: 'carrier' | 'broker' | 'regulator';

  @Column({ name: 'status', type: 'text', default: 'pending' })
  status!: SubjectivityStatus;

  @Column({ name: 'document_refs', type: 'text', array: true, default: () => "ARRAY[]::text[]" })
  documentRefs!: string[];

  @Column({ name: 'fulfilled_at', type: 'timestamptz', nullable: true })
  fulfilledAt!: Date | null;

  @Column({ name: 'waived_at', type: 'timestamptz', nullable: true })
  waivedAt!: Date | null;

  @Column({ name: 'waived_by', type: 'text', nullable: true })
  waivedBy!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
