import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type AppetiteDecision = 'auto_accept' | 'auto_reject' | 'refer';

@Entity('underwriting_appetite')
@Index(['tenantId', 'lineOfBusiness', 'productId'])
@Index(['tenantId', 'priority', 'createdAt'])
export class UnderwritingAppetite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'text' })
  lineOfBusiness!: string;

  @Column({ type: 'text', nullable: true })
  productId!: string | null;

  @Column({ type: 'enum', enum: ['low', 'medium', 'high', 'critical'] })
  riskLevel!: RiskLevel;

  @Column({ type: 'enum', enum: ['auto_accept', 'auto_reject', 'refer'] })
  decision!: AppetiteDecision;

  @Column({ name: 'min_sum_insured', type: 'numeric', nullable: true })
  minSumInsured!: number | null;

  @Column({ name: 'max_sum_insured', type: 'numeric', nullable: true })
  maxSumInsured!: number | null;

  @Column({ name: 'min_premium', type: 'numeric', nullable: true })
  minPremium!: number | null;

  @Column({ name: 'max_premium', type: 'numeric', nullable: true })
  maxPremium!: number | null;

  @Column({ type: 'text', nullable: true })
  authorityLevel!: string | null; // e.g., 'junior', 'senior', 'committee'

  @Column({ type: 'text', nullable: true })
  approverRole!: string | null;

  @Column({ type: 'int', default: 0 })
  priority!: number;

  @Column({ type: 'int', default: 0 })
  slaHours!: number;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
