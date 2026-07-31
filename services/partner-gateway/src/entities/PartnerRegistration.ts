import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type RelationshipType = 'carrier_broker' | 'mga_carrier' | 'agency_carrier';
export type PartnerStatus = 'active' | 'suspended' | 'revoked';

@Entity('partner_registrations')
@Index(['tenantId', 'partnerTenantId'], { unique: true })
@Index(['organizationId'])
@Index(['partnerOrganizationId'])
@Index(['status'])
export class PartnerRegistration {
  @PrimaryGeneratedColumn('uuid', { name: 'partner_id' })
  partnerId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ name: 'organization_id', type: 'text' })
  organizationId!: string;

  @Column({ name: 'partner_tenant_id', type: 'text' })
  partnerTenantId!: string;

  @Column({ name: 'partner_organization_id', type: 'text' })
  partnerOrganizationId!: string;

  @Column({ name: 'relationship_type', type: 'text' })
  relationshipType!: RelationshipType;

  @Column({ name: 'mtls_cert_subject', type: 'text' })
  mTlsCertSubject!: string;

  @Column({ name: 'allowed_scopes', type: 'jsonb', default: [] })
  allowedScopes!: string[];

  @Column({ name: 'allowed_apis', type: 'jsonb', default: [] })
  allowedApis!: string[];

  @Column({ name: 'rate_limit_rps', type: 'int', default: 100 })
  rateLimitRps!: number;

  @Column({ name: 'status', type: 'text', default: 'active' })
  status!: PartnerStatus;

  @Column({ name: 'valid_from', type: 'timestamptz' })
  validFrom!: Date;

  @Column({ name: 'valid_to', type: 'timestamptz', nullable: true })
  validTo!: Date | null;

  @Column({ name: 'distribution_agreement_id', type: 'text', nullable: true })
  distributionAgreementId!: string | null;

  @Column({ name: 'token_exchange_endpoint', type: 'text', nullable: true })
  tokenExchangeEndpoint!: string | null;

  @Column({ name: 'partner_api_gateway_url', type: 'text', nullable: true })
  partnerApiGatewayUrl!: string | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({ name: 'revoked_reason', type: 'text', nullable: true })
  revokedReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
