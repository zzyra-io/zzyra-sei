import { IsString, IsDecimal, IsOptional } from "class-validator";

export class UpdateUsageDto {
  @IsDecimal()
  amount: string;

  @IsOptional()
  @IsString()
  transactionHash?: string;
}
