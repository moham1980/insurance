import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type LegalType = 'person' | 'company' | 'government';
export type OrganizationStatus = 'active' | 'suspended' | 'revoked';

@Entity('organizations')
@Index(['tenantId', 'nationalIdBlindIndex'], { unique: true, where: "\"national_id_blind_index\" IS NOT NULL" })
@Index(['tenantId', 'regulatoryCode'], { unique: true, where: "\"regulatory_code\" IS NOT NULL" })
@Index(['tenantId', 'country', 'status'])
export class Organization {
  @PrimaryGeneratedColumn('uuid', { name: 'organization_id' })
  organizationId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ name: 'legal_type', type: 'text' })
  legalType!: LegalType;

  @Column({ name: 'national_id_blind_index', type: 'text', nullable: true })
  nationalIdBlindIndex!: string | null;

  @Column({ name: 'regulatory_code', type: 'text', nullable: true })
  regulatoryCode!: string | null;

  @Column({ name: 'country', type: 'text' })
  country!: string;

  @Column({ name: 'status', type: 'text', default: 'active' })
  status!: OrganizationStatus;

  @Column({ name: 'legal_address', type: 'jsonb' })
  legalAddress!: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
