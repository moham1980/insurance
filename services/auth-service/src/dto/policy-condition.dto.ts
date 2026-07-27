import { IsIn, IsNotEmpty, IsString } from 'class-validator';

const ALLOWED_OPERATORS = ['equals', 'not_equals', 'contains', 'in', 'not_in', 'greater_than', 'less_than', 'exists'] as const;

export class PolicyConditionDto {
  @IsString()
  @IsNotEmpty()
  attribute: string;

  @IsIn(ALLOWED_OPERATORS)
  operator: typeof ALLOWED_OPERATORS[number];

  value: any;
}
