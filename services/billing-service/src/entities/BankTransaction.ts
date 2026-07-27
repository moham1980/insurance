import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('bank_transactions')
@Index(['tenantId', 'status'])
export class BankTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId!: string | null;

  @Column({ type: 'varchar', length: 100 })
  accountNumber!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount!: number;

  @Column({ type: 'timestamp' })
  transactionDate!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  senderName!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  senderAccount!: string | null;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status!: string;

  @Column({ type: 'uuid', nullable: true })
  matchedInvoiceId!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
