import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type NbaTrigger = 'policy_renewal_due' | 'claim_submitted' | 'birthday' | 'life_event' | 'cross_sell' | 'upsell' | 'retention' | 'onboarding' | 'payment_due';
export type NbaChannel = 'sms' | 'email' | 'push' | 'agent_call' | 'portal' | 'app';
export type NbaPriority = 'low' | 'medium' | 'high' | 'critical';

@Entity('next_best_actions')
@Index(['tenantId', 'customerId'])
@Index(['trigger', 'active'])
export class NextBestAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid' })
  customerId: string;

  @Column({ type: 'enum', enum: ['policy_renewal_due', 'claim_submitted', 'birthday', 'life_event', 'cross_sell', 'upsell', 'retention', 'onboarding', 'payment_due'] })
  trigger: NbaTrigger;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: ['low', 'medium', 'high', 'critical'] })
  priority: NbaPriority;

  @Column({ type: 'text' })
  channels: string; // comma-separated NbaChannel values

  @Column({ type: 'text', nullable: true })
  ctaLabel: string | null;

  @Column({ type: 'text', nullable: true })
  ctaUrl: string | null;

  @Column({ type: 'jsonb', nullable: true })
  context: Record<string, any> | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  executedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
