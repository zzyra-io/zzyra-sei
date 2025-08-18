import { SecurityLevel } from "@zzyra/types";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsDecimal,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

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

  @IsOptional()
  @IsString()
  serializedSessionParams?: string; // ZeroDv SessionKeyProvider serialized params
}
