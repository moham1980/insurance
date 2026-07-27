import { IsString, IsArray, IsOptional, ArrayNotEmpty } from 'class-validator';

export class ServiceTokenDto {
  @IsString()
  serviceId!: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty()
  permissions!: string[];

  @IsOptional()
  @IsString()
  tenantId?: string;
}
