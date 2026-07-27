import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('identity_proofing_record')
@Index(['tenantId', 'partyId'])
export class IdentityProofingRecord {
  @PrimaryColumn({ type: 'uuid', name: 'proofing_id' })
  proofingId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ type: 'uuid', name: 'party_id' })
  partyId!: string;

  @Column({ name: 'face_match_score', type: 'float' })
  faceMatchScore!: number;

  @Column({ name: 'face_match_threshold', type: 'float' })
  faceMatchThreshold!: number;

  @Column({ name: 'dedup_match_found', type: 'boolean' })
  dedupMatchFound!: boolean;

  @Column({ name: 'dedup_match_ids', type: 'jsonb' })
  dedupMatchIds!: string[];

  @Column({ name: 'liveness_check', type: 'boolean' })
  livenessCheck!: boolean;

  @Column({ name: 'document_authenticity', type: 'boolean' })
  documentAuthenticity!: boolean;

  @Column({ name: 'confidence_score', type: 'float' })
  confidenceScore!: number;

  @Column({ type: 'varchar' })
  status!: 'passed' | 'failed' | 'manual_review';

  @CreateDateColumn({ name: 'completed_at' })
  completedAt!: Date;
}
