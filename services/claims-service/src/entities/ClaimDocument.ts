import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type ClaimDocumentType = 'police_report' | 'medical_report' | 'repair_estimate' | 'invoice' | 'photo' | 'video' | 'other';
export type ClaimDocumentClassification = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'PII';

@Entity('claim_documents')
@Index(['claimId'])
@Index(['caseId'])
@Index(['uploadedByPartyId'])
@Index(['tenantId'])
export class ClaimDocument {
  @PrimaryGeneratedColumn('uuid', { name: 'document_id' })
  documentId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'claim_id', type: 'uuid' })
  claimId: string;

  @Column({ name: 'case_id', type: 'uuid', nullable: true })
  caseId: string | null;

  @Column({ name: 'uploaded_by_party_id', type: 'uuid' })
  uploadedByPartyId: string;

  @Column({ name: 'uploaded_by_organization_id', type: 'uuid', nullable: true })
  uploadedByOrganizationId: string | null;

  @Column({ name: 'document_type', type: 'text' })
  documentType: ClaimDocumentType;

  @Column({ name: 'storage_ref', type: 'text' })
  storageRef: string;

  @Column({ name: 'checksum', type: 'text' })
  checksum: string;

  @Column({ name: 'file_name', type: 'text', nullable: true })
  fileName: string | null;

  @Column({ name: 'file_size', type: 'int', nullable: true })
  fileSize: number | null;

  @Column({ name: 'mime_type', type: 'text', nullable: true })
  mimeType: string | null;

  @Column({ name: 'classification', type: 'text', default: 'INTERNAL' })
  classification: ClaimDocumentClassification;

  @Column({ name: 'consent_required', type: 'boolean', default: false })
  consentRequired: boolean;

  @Column({ name: 'consent_record_id', type: 'uuid', nullable: true })
  consentRecordId: string | null;

  @Column({ name: 'virus_scan_status', type: 'text', default: 'pending' })
  virusScanStatus: 'pending' | 'clean' | 'infected' | 'error';

  @Column({ name: 'pii_scan_status', type: 'text', default: 'pending' })
  piiScanStatus: 'pending' | 'clean' | 'detected' | 'error';

  @Column({ name: 'uploaded_at', type: 'timestamptz' })
  uploadedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
