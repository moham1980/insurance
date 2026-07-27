import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  IsObject,
  IsEnum,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';

export class CreateUnderwritingRequestDto {
  @IsUUID('all')
  policyId!: string;

  @IsString()
  reasonCode!: string;

  @IsOptional()
  @IsObject()
  input?: Record<string, any>;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsString()
  source?: string;
}

export class DecideDto {
  @IsEnum(['approved', 'rejected', 'escalated'] as const)
  decision!: 'approved' | 'rejected' | 'escalated';

  @IsOptional()
  @IsString()
  decidedBy?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  result?: Record<string, any>;
}

export class EscalateDto {
  @IsString()
  reason!: string;
}

export class RiskFactorsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(120)
  age?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pastClaimsCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  coverageAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  premiumAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  itemAge?: number;

  @IsOptional()
  @IsString()
  policyType?: string;
}

export class AssessRiskDto {
  @ValidateNested()
  @Type(() => RiskFactorsDto)
  factors!: RiskFactorsDto;
}

export class CreateAppetiteRuleDto {
  @IsString()
  lineOfBusiness!: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsEnum(['low', 'medium', 'high', 'critical'] as const)
  riskLevel!: 'low' | 'medium' | 'high' | 'critical';

  @IsEnum(['auto_accept', 'auto_reject', 'refer'] as const)
  decision!: 'auto_accept' | 'auto_reject' | 'refer';

  @IsOptional()
  @IsNumber()
  @Min(0)
  minSumInsured?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxSumInsured?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPremium?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPremium?: number;

  @IsOptional()
  @IsString()
  authorityLevel?: string;

  @IsOptional()
  @IsString()
  approverRole?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  slaHours?: number;
}

export class EvaluateAppetiteDto {
  @IsString()
  lineOfBusiness!: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsEnum(['low', 'medium', 'high', 'critical'] as const)
  riskLevel!: 'low' | 'medium' | 'high' | 'critical';

  @IsOptional()
  @IsNumber()
  @Min(0)
  sumInsured?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  premium?: number;
}

export class UpdateAppetiteRuleDto {
  @IsOptional()
  @IsEnum(['auto_accept', 'auto_reject', 'refer'] as const)
  decision?: 'auto_accept' | 'auto_reject' | 'refer';

  @IsOptional()
  @IsNumber()
  @Min(0)
  minSumInsured?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxSumInsured?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPremium?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPremium?: number;

  @IsOptional()
  @IsString()
  authorityLevel?: string;

  @IsOptional()
  @IsString()
  approverRole?: string;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  slaHours?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ListRequestsQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsUUID('all')
  policyId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  @Type(() => Number)
  limit?: number = 50;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}

export class ListAppetiteRulesQueryDto {
  @IsOptional()
  @IsString()
  lineOfBusiness?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  active?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  @Type(() => Number)
  limit?: number = 50;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}

export class SlaBreachesQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  hoursOverdue?: number = 48;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  @Type(() => Number)
  limit?: number = 50;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}

export class SlaMetricsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
