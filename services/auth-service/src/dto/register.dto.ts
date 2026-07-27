import { IsString, IsEmail, MinLength, IsOptional } from 'class-validator';

/**
 * Public user registration DTO.
 * Privileged fields (roles, orgUnitId, positionTitle, nationalId) are NOT
 * accepted from anonymous callers. They are managed via admin/provisioning
 * endpoints after authentication (setRoles / assignOrgUnit).
 */
export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(3)
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  department?: string;
}
