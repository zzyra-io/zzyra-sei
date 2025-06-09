import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
} from "class-validator";

export class UpdateProfileDto {
  @ApiProperty({ description: "User full name", required: false })
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiProperty({ description: "Enable email notifications", required: false })
  @IsOptional()
  @IsBoolean()
  email_notifications?: boolean;

  @ApiProperty({ description: "Telegram handle", required: false })
  @IsOptional()
  @IsString()
  telegram_handle?: string;

  @ApiProperty({ description: "Discord webhook URL", required: false })
  @IsOptional()
  @IsString()
  discord_webhook?: string;

  @ApiProperty({ description: "Dark mode preference", required: false })
  @IsOptional()
  @IsBoolean()
  dark_mode?: boolean;
}

export class ProfileResponseDto {
  @ApiProperty({ description: "User ID" })
  id: string;

  @ApiProperty({ description: "User full name" })
  full_name: string;

  @ApiProperty({ description: "Email notifications enabled" })
  email_notifications: boolean;

  @ApiProperty({ description: "Telegram handle" })
  telegram_handle: string;

  @ApiProperty({ description: "Discord webhook URL" })
  discord_webhook: string;

  @ApiProperty({ description: "Dark mode enabled" })
  dark_mode: boolean;

  @ApiProperty({ description: "Subscription tier" })
  subscription_tier: string;

  @ApiProperty({ description: "Subscription status" })
  subscription_status: string;

  @ApiProperty({ description: "Subscription expiry date" })
  subscription_expires_at: string | null;

  @ApiProperty({ description: "Monthly execution quota" })
  monthly_execution_quota: number;

  @ApiProperty({ description: "Monthly executions used" })
  monthly_executions_used: number;

  @ApiProperty({ description: "Last updated timestamp" })
  updated_at: string;
}

export class UsageResponseDto {
  @ApiProperty({ description: "Monthly execution quota" })
  monthly_execution_quota: number;

  @ApiProperty({ description: "Monthly executions used" })
  monthly_executions_used: number;

  @ApiProperty({ description: "Subscription tier" })
  subscription_tier: string;
}

export class CreateWalletDto {
  @ApiProperty({ description: "Wallet address" })
  @IsString()
  walletAddress: string;

  @ApiProperty({ description: "Chain ID" })
  @IsNumber()
  chainId: number;

  @ApiProperty({ description: "Wallet type", required: false })
  @IsOptional()
  @IsString()
  walletType?: string;

  @ApiProperty({ description: "Chain type", required: false })
  @IsOptional()
  @IsString()
  chainType?: string;

  @ApiProperty({ description: "Additional metadata", required: false })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class WalletResponseDto {
  @ApiProperty({ description: "Wallet ID" })
  id: string;

  @ApiProperty({ description: "User ID" })
  userId: string;

  @ApiProperty({ description: "Wallet address" })
  walletAddress: string;

  @ApiProperty({ description: "Chain ID" })
  chainId: string;

  @ApiProperty({ description: "Wallet type" })
  walletType: string;

  @ApiProperty({ description: "Chain type" })
  chainType: string;

  @ApiProperty({ description: "Additional metadata" })
  metadata: Record<string, any>;

  @ApiProperty({ description: "Creation timestamp" })
  createdAt: string;

  @ApiProperty({ description: "Last updated timestamp" })
  updatedAt: string;
}

export class WalletTransactionResponseDto {
  @ApiProperty({ description: "Transaction ID" })
  id: string;

  @ApiProperty({ description: "User ID" })
  userId: string;

  @ApiProperty({ description: "Wallet address" })
  walletAddress: string;

  @ApiProperty({ description: "Transaction hash" })
  transactionHash: string;

  @ApiProperty({ description: "Chain ID" })
  chainId: string;

  @ApiProperty({ description: "Transaction type" })
  type: string;

  @ApiProperty({ description: "Amount" })
  amount: string;

  @ApiProperty({ description: "Token symbol" })
  symbol: string;

  @ApiProperty({ description: "Transaction metadata" })
  metadata: Record<string, any>;

  @ApiProperty({ description: "Creation timestamp" })
  createdAt: string;
}
