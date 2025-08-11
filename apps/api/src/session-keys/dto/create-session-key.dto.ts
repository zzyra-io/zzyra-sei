import {
  IsString,
  IsEnum,
  IsArray,
  IsDateString,
  IsBoolean,
  IsOptional,
  ValidateNested,
  IsDecimal,
} from "class-validator";
import { Type } from "class-transformer";
import { SecurityLevel } from "@zzyra/types";

export class SessionPermissionDto {
  @IsString()
  operation: string;

  @IsDecimal()
  maxAmountPerTx: string;

  @IsDecimal()
  maxDailyAmount: string;

  @IsArray()
  @IsString({ each: true })
  allowedContracts: string[];

  @IsBoolean()
  requireConfirmation: boolean;

  @IsBoolean()
  emergencyStop: boolean;
}

export class CreateSessionKeyDto {
  @IsString()
  walletAddress: string;

  @IsOptional()
  @IsString()
  smartWalletOwner?: string;

  @IsString()
  chainId: string;

  @IsEnum(SecurityLevel)
  securityLevel: SecurityLevel;

  @IsDateString()
  validUntil: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionPermissionDto)
  permissions: SessionPermissionDto[];

  @IsString()
  userSignature: string;
}
