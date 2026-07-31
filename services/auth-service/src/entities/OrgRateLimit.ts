import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('org_rate_limits')
@Index(['organizationId'], { unique: true })
@Index(['agreementId'])
export class OrgRateLimit {
  @PrimaryGeneratedColumn('uuid', { name: 'rate_limit_id' })
  rateLimitId!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ name: 'agreement_id', type: 'uuid', nullable: true })
  agreementId!: string | null;

  @Column({ name: 'requests_per_minute', type: 'int', default: 600 })
  requestsPerMinute!: number;

  @Column({ name: 'requests_per_hour', type: 'int', default: 10000 })
  requestsPerHour!: number;

  @Column({ name: 'requests_per_day', type: 'int', default: 100000 })
  requestsPerDay!: number;

  @Column({ name: 'burst_limit', type: 'int', default: 100 })
  burstLimit!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
