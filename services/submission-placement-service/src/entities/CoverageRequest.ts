import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('coverage_requests')
@Index(['submissionId'])
@Index(['productCoverageId'])
export class CoverageRequest {
  @PrimaryGeneratedColumn('uuid', { name: 'coverage_request_id' })
  coverageRequestId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'submission_id', type: 'uuid' })
  submissionId!: string;

  @Column({ name: 'product_coverage_id', type: 'uuid' })
  productCoverageId!: string;

  @Column({ name: 'coverage_code', type: 'text' })
  coverageCode!: string;

  @Column({ name: 'coverage_name_fa', type: 'text', nullable: true })
  coverageNameFa!: string | null;

  @Column({ name: 'requested_limit_amount_minor', type: 'numeric', nullable: true })
  requestedLimitAmountMinor!: string | null;

  @Column({ name: 'currency', type: 'text', default: 'IRR' })
  currency!: string;

  @Column({ name: 'terms', type: 'jsonb', nullable: true })
  terms!: Record<string, any> | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
