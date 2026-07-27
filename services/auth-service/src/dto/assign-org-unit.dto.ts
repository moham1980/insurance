import { IsOptional, IsString, IsUUID } from 'class-validator';

export class AssignOrgUnitDto {
  @IsOptional()
  @IsString()
  @IsUUID()
  orgUnitId?: string;
}
