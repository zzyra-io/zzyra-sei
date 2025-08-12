import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsDateString,
  IsEnum,
  IsOptional,
  IsEthereumAddress,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SecurityLevel } from '@zzyra/types';

export class CreatePimlicoPermissionDto {
  @IsString()
  @IsNotEmpty()
  operation: string;

  @IsString()
  @IsNotEmpty()
  maxAmountPerTx: string;

  @IsString()
  @IsNotEmpty()
  maxDailyAmount: string;

  @IsArray()
  @IsString({ each: true })
  allowedContracts: string[];

  @IsOptional()
  requireConfirmation: boolean = false;

  @IsOptional()
  emergencyStop: boolean = false;
}

export class CreatePimlicoSessionKeyDto {
  @IsString()
  @IsNotEmpty()
  @IsEthereumAddress()
  walletAddress: string; // EOA wallet address

  @IsString()
  @IsNotEmpty()
  @IsEthereumAddress()
  smartAccountAddress: string; // Real SimpleAccount address from frontend

  @IsString()
  @IsNotEmpty()
  chainId: string; // Chain ID (1328 for SEI Testnet)

  @IsEnum(SecurityLevel)
  securityLevel: SecurityLevel;

  @IsDateString()
  validUntil: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePimlicoPermissionDto)
  permissions: CreatePimlicoPermissionDto[];

  @IsString()
  @IsNotEmpty()
  userSignature: string; // User's signature of the delegation message
}