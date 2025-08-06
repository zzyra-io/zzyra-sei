import { IsString, IsDecimal } from "class-validator";

export class ValidateSessionKeyDto {
  @IsString()
  operation: string;

  @IsDecimal()
  amount: string;

  @IsString()
  toAddress: string;
}
