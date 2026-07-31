import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('policy_documents')
@Index(['policyId', 'documentType'])
export class PolicyDocument {
  @PrimaryGeneratedColumn('uuid', { name: 'policy_document_id' })
  policyDocumentId!: string;

  @Column({ name: 'tenant_id', type: 'text', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'policy_id', type: 'uuid' })
  policyId!: string;

  @Column({ name: 'document_type', type: 'text' })
  documentType!: string;

  @Column({ name: 'storage_ref', type: 'text' })
  storageRef!: string;

  @Column({ name: 'checksum', type: 'text', nullable: true })
  checksum!: string | null;

  @Column({ name: 'digest', type: 'text', nullable: true })
  digest!: string | null;

  @Column({ name: 'signed_by', type: 'text', nullable: true })
  signedBy!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
