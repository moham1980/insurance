import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class SetRolesDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty()
  roles!: string[];
}
