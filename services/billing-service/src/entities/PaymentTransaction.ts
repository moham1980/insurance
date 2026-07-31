import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import type { PaymentProvider } from '../payment-gateway/payment-gateway.service';

export type PaymentTransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

@Entity('payment_transactions')
@Index(['tenantId', 'invoiceId'])
@Index(['authority'])
@Index(['idempotencyKey'])
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  invoiceId!: string;

  @Column({ type: 'numeric', precision: 20, scale: 0 })
  amount!: string;

  @Column({ type: 'enum', enum: ['ZARINPAL', 'IDPAY', 'PAYIR', 'BEHPARDAKHT', 'SAMAN', 'MELLAT', 'PASARGAD', 'ECOSYSTEM'] })
  provider!: PaymentProvider;

  @Column({ type: 'varchar', length: 255 })
  authority!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  refId!: string | null;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'],
    default: 'PENDING',
  })
  status!: PaymentTransactionStatus;

  @Column({ type: 'text' })
  callbackUrl!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  idempotencyKey!: string | null;

  @Column({ name: 'payment_state', type: 'text', nullable: true })
  paymentState!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
