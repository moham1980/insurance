import { IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PolicyConditionDto } from './policy-condition.dto';

const ALLOWED_EFFECTS = ['allow', 'deny'] as const;
const ALLOWED_STATUSES = ['active', 'draft', 'deprecated'] as const;

export class CreatePolicyDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsIn(ALLOWED_EFFECTS)
  @IsOptional()
  effect?: 'allow' | 'deny';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PolicyConditionDto)
  conditions: PolicyConditionDto[];

  @IsInt()
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsIn(ALLOWED_STATUSES)
  @IsOptional()
  status?: 'active' | 'draft' | 'deprecated';
}
