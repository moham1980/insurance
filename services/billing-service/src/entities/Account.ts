import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  REVENUE = 'revenue',
  EXPENSE = 'expense',
}

export enum AccountCategory {
  CURRENT_ASSET = 'current_asset',
  FIXED_ASSET = 'fixed_asset',
  CURRENT_LIABILITY = 'current_liability',
  LONG_TERM_LIABILITY = 'long_term_liability',
  OWNERS_EQUITY = 'owners_equity',
  OPERATING_REVENUE = 'operating_revenue',
  NON_OPERATING_REVENUE = 'non_operating_revenue',
  OPERATING_EXPENSE = 'operating_expense',
  NON_OPERATING_EXPENSE = 'non_operating_expense',
}

@Entity('accounts')
@Index(['tenantId', 'accountCode'])
@Index(['accountType'])
@Index(['isActive'])
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  accountCode!: string;

  @Column({ type: 'varchar', length: 100 })
  accountName!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description!: string | null;

  @Column({ type: 'enum', enum: AccountType })
  accountType!: AccountType;

  @Column({ type: 'enum', enum: AccountCategory })
  category!: AccountCategory;

  @Column({ type: 'varchar', length: 20, nullable: true })
  parentAccountCode!: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  openingBalance!: number;

  @Column({ type: 'date', nullable: true })
  openingBalanceDate!: Date | null;

  @Column({ type: 'boolean', default: false })
  isSystemAccount!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
