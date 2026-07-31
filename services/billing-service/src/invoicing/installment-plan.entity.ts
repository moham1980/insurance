import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
export type InstallmentPlanStatus = 'active' | 'completed' | 'defaulted';
export type InstallmentStatus = 'open' | 'paid' | 'overdue' | 'defaulted';

@Entity('installment_plans')
@Index(['invoiceId'])
export class PremiumInstallmentPlan {
  @PrimaryGeneratedColumn('uuid', { name: 'plan_id' })
  planId!: string;

  @Column({ name: 'invoice_id', type: 'uuid' })
  invoiceId!: string;

  @Column({ name: 'number_of_installments', type: 'int' })
  numberOfInstallments!: number;

  @Column({ name: 'schedule', type: 'jsonb' })
  schedule!: InstallmentScheduleItem[];

  @Column({ name: 'status', type: 'text', default: 'active' })
  status!: InstallmentPlanStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

export interface InstallmentScheduleItem {
  itemId: string;
  installmentNumber: number;
  dueDate: Date;
  amountMinor: string;
  currency: string;
  status: InstallmentStatus;
  paidAt?: Date;
  paymentId?: string;
}
