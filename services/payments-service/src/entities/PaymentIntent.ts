import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('payment_intents')
@Index(['tenantId'])
@Index(['claimId'])
@Index(['gatewayPaymentId'])
@Index(['status', 'updatedAt'])
@Index(['tenantId', 'idempotencyKey'], { unique: true })
export class PaymentIntent {
  @PrimaryGeneratedColumn('uuid', { name: 'payment_intent_id' })
  paymentIntentId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ name: 'claim_id', type: 'text' })
  claimId!: string;

  @Column({ name: 'amount', type: 'numeric' })
  amount!: number;

  @Column({ name: 'currency', type: 'text', default: 'IRR' })
  currency!: string;

  @Column({ name: 'is_partial', type: 'boolean', default: false })
  isPartial!: boolean;

  @Column({ name: 'partial_index', type: 'int', nullable: true })
  partialIndex!: number | null;

  @Column({ name: 'total_partial_count', type: 'int', nullable: true })
  totalPartialCount!: number | null;

  @Column({ name: 'beneficiary_party_id', type: 'uuid', nullable: true })
  beneficiaryPartyId!: string | null;

  @Column({ name: 'destination_iban', type: 'text', nullable: true })
  destinationIban!: string | null;

  @Column({ name: 'status', type: 'text', default: 'prepared' })
  status!: 'prepared' | 'finance_approved' | 'gateway_initiated' | 'executed' | 'notified' | 'failed' | 'cancelled';

  @Column({ name: 'gateway_payment_id', type: 'uuid', nullable: true })
  gatewayPaymentId!: string | null;

  @Column({ name: 'prepared_by_user_id', type: 'text', nullable: true })
  preparedByUserId!: string | null;

  @Column({ name: 'idempotency_key', type: 'text' })
  idempotencyKey!: string;

  // مرحله 5 پرداخت: آماده‌سازی مدارک پرداخت
  @Column({ name: 'payment_docs', type: 'jsonb', nullable: true })
  paymentDocs!: Record<string, any> | null;

  // مرحله 5 پرداخت: تأیید مالی
  @Column({ name: 'finance_approval', type: 'jsonb', nullable: true })
  financeApproval!: Record<string, any> | null;

  // مرحله 5 پرداخت: واریز
  @Column({ name: 'execution_result', type: 'jsonb', nullable: true })
  executionResult!: Record<string, any> | null;

  // مرحله 5 پرداخت: ابلاغ
  @Column({ name: 'notification_result', type: 'jsonb', nullable: true })
  notificationResult!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
