import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('payments')
@Index(['tenantId'])
@Index(['paymentIntentId', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['tenantId', 'paymentIntentId', 'providerRef', 'status'], { unique: true })
export class Payment {
  @PrimaryGeneratedColumn('uuid', { name: 'payment_id' })
  paymentId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ name: 'payment_intent_id', type: 'uuid' })
  paymentIntentId!: string;

  @Column({ name: 'status', type: 'text' })
  status!: 'executed' | 'failed' | 'refunded' | 'disputed';

  @Column({ name: 'provider', type: 'text', nullable: true })
  provider!: string | null;

  @Column({ name: 'provider_ref', type: 'text', nullable: true })
  providerRef!: string | null;

  @Column({ name: 'amount', type: 'numeric' })
  amount!: number;

  @Column({ name: 'currency', type: 'text', default: 'IRR' })
  currency!: string;

  @Column({ name: 'details', type: 'jsonb', nullable: true })
  details!: Record<string, any> | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
