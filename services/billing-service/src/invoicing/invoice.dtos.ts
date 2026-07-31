import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceLineType } from './invoice-line.entity';

export class MoneyDto {
  @IsString()
  @Length(1, 32)
  amountMinor!: string;

  @IsString()
  @Length(3, 3)
  currency!: string;
}

export class FeeLineDto {
  @IsString()
  feeType!: string;

  @IsString()
  description!: string;

  @ValidateNested()
  @Type(() => MoneyDto)
  amount!: MoneyDto;
}

export class PremiumInvoiceLineDto {
  @IsEnum(InvoiceLineType)
  lineType!: InvoiceLineType;

  @IsString()
  description!: string;

  @ValidateNested()
  @Type(() => MoneyDto)
  amount!: MoneyDto;

  @ValidateNested()
  @IsOptional()
  @Type(() => MoneyDto)
  taxAmount?: MoneyDto;
}

export class CreatePremiumInvoiceDto {
  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsString()
  customerPartyId!: string;

  @IsString()
  invoiceNumber!: string;

  @IsDateString()
  issueDate!: Date;

  @IsDateString()
  dueDate!: Date;

  @ValidateNested()
  @Type(() => MoneyDto)
  totalPremium!: MoneyDto;

  @ValidateNested()
  @Type(() => MoneyDto)
  taxes!: MoneyDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeeLineDto)
  fees!: FeeLineDto[];

  @ValidateNested()
  @Type(() => MoneyDto)
  totalAmount!: MoneyDto;

  @IsString()
  @Length(3, 3)
  currency!: string;

  @IsString()
  @IsOptional()
  paymentMethod?: 'card' | 'account_transfer' | 'installment' | 'cash' | 'cheque';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PremiumInvoiceLineDto)
  lines!: PremiumInvoiceLineDto[];

  @IsString()
  @IsOptional()
  endorsementId?: string;
}

export class IssuePremiumInvoiceDto {
  @IsString()
  @IsOptional()
  reason?: string;
}

export class CancelPremiumInvoiceDto {
  @IsString()
  reason!: string;
}

export class CreateInstallmentPlanDto {
  @IsNumber()
  @Min(2)
  @Type(() => Number)
  numberOfInstallments!: number;

  @IsDateString()
  firstDueDate!: Date;
}

export class PayInstallmentDto {
  @IsString()
  paymentMethod!: string;

  @IsString()
  sourceAccount!: string;
}
