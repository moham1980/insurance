import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('rm_claim_documents_attached')
@Index(['updatedAt'])
@Index(['lastAttachedAt'])
export class RmClaimDocumentsAttached {
  @PrimaryColumn({ name: 'claim_id', type: 'text' })
  claimId: string;

  @Column({ name: 'documents_count', type: 'int', default: 0 })
  documentsCount: number;

  @Column({ name: 'types_summary', type: 'jsonb', nullable: true })
  typesSummary: Record<string, number> | null;

  @Column({ name: 'last_document_id', type: 'text', nullable: true })
  lastDocumentId: string | null;

  @Column({ name: 'last_attached_at', type: 'timestamptz', nullable: true })
  lastAttachedAt: Date | null;

  @Column({ name: 'last_event_id', type: 'uuid', nullable: true })
  lastEventId: string | null;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;
}
