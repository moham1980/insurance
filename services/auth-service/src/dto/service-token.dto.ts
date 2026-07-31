import { IsString, IsArray, IsOptional, ArrayNotEmpty, IsObject } from 'class-validator';

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

  @IsOptional()
  @IsString()
  agreementId?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsObject()
  fieldAcl?: {
    visibleFields?: string[];
    editableFields?: string[];
    hiddenFields?: string[];
  };
}
