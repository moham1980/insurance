import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

export enum NotificationChannel {
  SMS = 'sms',
  EMAIL = 'email',
  PUSH = 'push',
}

export enum NotificationType {
  CLAIM_REGISTERED = 'claim_registered',
  CLAIM_SUBMITTED = 'claim_submitted',
  CLAIM_APPROVED = 'claim_approved',
  CLAIM_PAID = 'claim_paid',
  POLICY_ISSUED = 'policy_issued',
  PAYMENT_DUE = 'payment_due',
  PAYMENT_RECEIVED = 'payment_received',
  INSTALLMENT_DUE = 'installment_due',
  INSTALLMENT_REMINDER = 'installment_reminder',
  OVERDUE_NOTICE = 'overdue_notice',
  COMPLAINT_CREATED = 'complaint_created',
  COMPLAINT_RECEIVED = 'complaint_received',
  COMPLAINT_RESOLVED = 'complaint_resolved',
  PASSWORD_RESET = 'password_reset',
  WELCOME = 'welcome',
  OTP = 'otp',
}

@Entity('notification_logs')
@Index(['status', 'createdAt'])
@Index(['channel', 'recipient'])
export class NotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  correlationId: string;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  recipient: string; // phone number or email

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.PENDING })
  status: NotificationStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
