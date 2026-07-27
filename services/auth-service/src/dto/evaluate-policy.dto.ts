import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class EvaluatePolicyDto {
  @IsObject()
  @IsNotEmpty()
  user: Record<string, any>;

  @IsObject()
  @IsNotEmpty()
  resource: Record<string, any>;

  @IsString()
  @IsNotEmpty()
  action: string;

  @IsObject()
  @IsOptional()
  context?: Record<string, any>;
}
