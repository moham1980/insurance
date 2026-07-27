import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PolicyConditionDto } from './policy-condition.dto';

const ALLOWED_EFFECTS = ['allow', 'deny'] as const;
const ALLOWED_STATUSES = ['active', 'draft', 'deprecated'] as const;

export class UpdatePolicyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsIn(ALLOWED_EFFECTS)
  @IsOptional()
  effect?: 'allow' | 'deny';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PolicyConditionDto)
  @IsOptional()
  conditions?: PolicyConditionDto[];

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
