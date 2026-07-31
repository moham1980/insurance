import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type QuoteResponseStatus = 'pending' | 'received' | 'expired' | 'selected' | 'rejected' | 'referred' | 'error';

@Entity('quote_responses')
@Index(['tenantId'])
@Index(['quoteRequestId'])
@Index(['submissionId'])
@Index(['carrierOrganizationId'])
@Index(['status'])
@Index(['isSelected'])
export class QuoteResponse {
  @PrimaryGeneratedColumn('uuid', { name: 'quote_response_id' })
  quoteResponseId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'quote_request_id', type: 'uuid' })
  quoteRequestId!: string;

  @Column({ name: 'submission_id', type: 'uuid' })
  submissionId!: string;

  @Column({ name: 'carrier_organization_id', type: 'uuid' })
  carrierOrganizationId!: string;

  @Column({ name: 'carrier_connector_id', type: 'uuid', nullable: true })
  carrierConnectorId!: string | null;

  @Column({ name: 'status', type: 'text', default: 'pending' })
  status!: QuoteResponseStatus;

  @Column({ name: 'received_at', type: 'timestamptz', nullable: true })
  receivedAt!: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'premium_amount_minor', type: 'numeric' })
  premiumAmountMinor!: string;

  @Column({ name: 'premium_currency', type: 'text', default: 'IRR' })
  premiumCurrency!: string;

  @Column({ name: 'base_premium_minor', type: 'numeric', nullable: true })
  basePremiumMinor!: string | null;

  @Column({ name: 'taxes_minor', type: 'numeric', nullable: true })
  taxesMinor!: string | null;

  @Column({ name: 'fees_minor', type: 'numeric', nullable: true })
  feesMinor!: string | null;

  @Column({ name: 'deductible_amount_minor', type: 'numeric', nullable: true })
  deductibleAmountMinor!: string | null;

  @Column({ name: 'coverage_snapshot', type: 'jsonb', nullable: true })
  coverageSnapshot!: Record<string, any>[] | null;

  @Column({ name: 'quote_snapshot', type: 'jsonb' })
  quoteSnapshot!: Record<string, any>;

  @Column({ name: 'rank_score', type: 'numeric', nullable: true })
  rankScore!: string | null;

  @Column({ name: 'comparison_factors', type: 'jsonb', nullable: true })
  comparisonFactors!: Record<string, any> | null;

  @Column({ name: 'commission_rate_bps', type: 'int', nullable: true })
  commissionRateBps!: number | null;

  @Column({ name: 'commission_amount_minor', type: 'numeric', nullable: true })
  commissionAmountMinor!: string | null;

  @Column({ name: 'markup_amount_minor', type: 'numeric', default: '0' })
  markupAmountMinor!: string;

  @Column({ name: 'is_selected', type: 'boolean', default: false })
  isSelected!: boolean;

  @Column({ name: 'selected_at', type: 'timestamptz', nullable: true })
  selectedAt!: Date | null;

  @Column({ name: 'idempotency_key', type: 'text', nullable: true })
  idempotencyKey!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
