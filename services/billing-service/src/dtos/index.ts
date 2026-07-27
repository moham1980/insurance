import { IsString, IsNumber, IsOptional, IsDateString, IsEnum, IsBoolean, IsArray, ValidateNested, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceStatus, InvoiceType } from '../entities/Invoice';
import { AccountType, AccountCategory } from '../entities/Account';

const paymentProviders = ['ZARINPAL', 'IDPAY', 'PAYIR', 'BEHPARDAKHT', 'SAMAN', 'MELLAT', 'PASARGAD', 'ECOSYSTEM'] as const;

export class InvoiceLineItemDto {
  @IsString()
  description!: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantity!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitPrice!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount!: number;
}

export class CreateInvoiceDto {
  @IsString()
  invoiceNumber!: string;

  @IsString()
  @IsOptional()
  policyId?: string;

  @IsString()
  @IsOptional()
  claimId?: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsEnum(InvoiceType)
  invoiceType!: InvoiceType;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount!: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  taxAmount?: number;

  @IsDateString()
  dueDate!: Date;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  @IsOptional()
  lineItems?: InvoiceLineItemDto[];

  @IsOptional()
  metadata?: Record<string, any>;
}

export class RecordPaymentDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount!: number;

  @IsDateString()
  paymentDate!: Date;

  @IsString()
  @IsOptional()
  reference?: string;
}

export class JournalEntryLineDto {
  @IsString()
  accountCode!: string;

  @IsString()
  description!: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  debitAmount!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  creditAmount!: number;

  @IsString()
  @IsOptional()
  reference?: string;
}

export class CreateJournalEntryDto {
  @IsString()
  entryNumber!: string;

  @IsString()
  description!: string;

  @IsDateString()
  entryDate!: Date;

  @IsString()
  @IsOptional()
  businessKey?: string;

  @IsString()
  @IsOptional()
  businessType?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalEntryLineDto)
  lines!: JournalEntryLineDto[];

  @IsOptional()
  metadata?: Record<string, any>;
}

export class ReverseJournalEntryDto {
  @IsString()
  reversalEntryNumber!: string;

  @IsString()
  reason!: string;
}

export class CreateAccountDto {
  @IsString()
  accountCode!: string;

  @IsString()
  accountName!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(AccountType)
  accountType!: AccountType;

  @IsEnum(AccountCategory)
  category!: AccountCategory;

  @IsString()
  @IsOptional()
  parentAccountCode?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  openingBalance?: number;

  @IsDateString()
  @IsOptional()
  openingBalanceDate?: Date;

  @IsBoolean()
  @IsOptional()
  isSystemAccount?: boolean;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateFinancialPeriodDto {
  @IsString()
  periodName!: string;

  @IsDateString()
  startDate!: Date;

  @IsDateString()
  endDate!: Date;

  @IsString()
  @IsOptional()
  fiscalYear?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  periodNumber?: number;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateCostCenterDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  type!: string;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class InitiatePaymentDto {
  @IsString()
  invoiceId!: string;

  @IsString()
  callbackUrl!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  mobile?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class VerifyPaymentDto {
  @IsString()
  paymentId!: string;

  @IsString()
  authority!: string;

  @IsString()
  @IsIn(paymentProviders)
  provider!: string;
}

export class IngestBankTransactionDto {
  @IsString()
  accountNumber!: string;

  @IsNumber()
  @Type(() => Number)
  amount!: number;

  @IsDateString()
  transactionDate!: Date;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  senderName?: string;

  @IsString()
  @IsOptional()
  senderAccount?: string;
}

export class AutoDepositConfigDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  checkIntervalMinutes?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  toleranceAmount?: number;

  @IsBoolean()
  @IsOptional()
  requireExactMatch?: boolean;

  @IsBoolean()
  @IsOptional()
  autoApproveHighConfidence?: boolean;

  @IsArray()
  @IsOptional()
  bankProviders?: string[];
}

export class RejectTransactionDto {
  @IsString()
  reason!: string;
}

export class ReconcileDto {
  @IsString()
  sourceType!: string;

  @IsString()
  sourceId!: string;

  @IsString()
  journalEntryId!: string;

  @IsNumber()
  @Type(() => Number)
  expectedAmount!: number;

  @IsNumber()
  @Type(() => Number)
  actualAmount!: number;

  @IsDateString()
  periodStart!: Date;

  @IsDateString()
  periodEnd!: Date;
}
