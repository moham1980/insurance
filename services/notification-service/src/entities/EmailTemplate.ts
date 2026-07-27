import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum EmailTemplateType {
  POLICY_ISSUED = 'policy_issued',
  POLICY_RENEWAL = 'policy_renewal',
  CLAIM_REGISTERED = 'claim_registered',
  CLAIM_APPROVED = 'claim_approved',
  CLAIM_PAID = 'claim_paid',
  PAYMENT_DUE = 'payment_due',
  PAYMENT_RECEIVED = 'payment_received',
  INSTALLMENT_REMINDER = 'installment_reminder',
  OVERDUE_NOTICE = 'overdue_notice',
  PASSWORD_RESET = 'password_reset',
  WELCOME = 'welcome',
  CLAIM_SUBMITTED = 'claim_submitted',
  COMPLAINT_RECEIVED = 'complaint_received',
  INSTALLMENT_DUE = 'installment_due',
}

@Entity('email_templates')
@Index(['tenantId', 'type', 'language'])
@Index(['tenantId', 'isActive'])
export class EmailTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'enum', enum: EmailTemplateType })
  type: EmailTemplateType;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  language: string;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'text', nullable: true })
  html: string;

  @Column({ type: 'jsonb', nullable: true })
  variables: Record<string, string>;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
