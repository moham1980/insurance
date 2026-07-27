import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type AmlConsentStatus = 'active' | 'revoked' | 'expired';

@Entity('aml_consents')
@Index(['status', 'createdAt'])
@Index(['subjectNationalId', 'createdAt'])
export class AmlConsent {
  @PrimaryGeneratedColumn('uuid', { name: 'consent_id' })
  consentId!: string;

  @Column({ name: 'subject_national_id', type: 'text' })
  subjectNationalId!: string;

  @Column({ name: 'consent_type', type: 'text' })
  consentType!: string;

  @Column({ name: 'status', type: 'text', default: 'active' })
  status!: AmlConsentStatus;

  @Column({ name: 'valid_from', type: 'timestamptz', nullable: true })
  validFrom!: Date | null;

  @Column({ name: 'valid_to', type: 'timestamptz', nullable: true })
  validTo!: Date | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
