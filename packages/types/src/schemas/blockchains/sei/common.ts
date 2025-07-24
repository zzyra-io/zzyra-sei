import { z } from "zod";

/**
 * Common types and schemas for Sei blockchain integration
 */

// Sei address validation regex
export const SEI_ADDRESS_REGEX = /^sei[0-9a-z]{38}$/;

// Common Sei network types
export const seiNetworkSchema = z
  .enum(["sei-mainnet", "sei-testnet"])
  .default("sei-testnet");

// Sei address validation schema
export const seiAddressSchema = z
  .string()
  .regex(SEI_ADDRESS_REGEX, "Invalid Sei address format");

// Standard input schema for all Sei blocks
export const standardInputSchema = z.object({
  data: z.any().optional(), // Generic data from previous blocks
  context: z
    .object({
      workflowId: z.string(),
      executionId: z.string(),
      userId: z.string(),
      timestamp: z.string(),
    })
    .optional(),
  variables: z.record(z.string(), z.any()).optional(), // Workflow variables
});

// Standard wallet configuration schema
export const walletConfigSchema = z.object({
  type: z.enum(["private_key", "mnemonic", "magic_wallet"]),
  credentials: z.string().optional(), // Encrypted storage reference
});

// Gas settings schema
export const gasSettingsSchema = z.object({
  gasLimit: z.number().min(1).optional(),
  gasPrice: z.number().min(1).optional(),
  estimateGas: z.boolean().default(true),
});

// Common event types for Sei blockchain
export const seiEventTypes = z.enum([
  "transfer",
  "swap",
  "contract_call",
  "nft_transfer",
  "nft_mint",
  "nft_burn",
  "governance_vote",
  "delegation",
  "undelegation",
]);

// Token denomination schema
export const tokenDenomSchema = z.string().min(1).default("usei");

// Transaction status enum
export const transactionStatusSchema = z.enum([
  "pending",
  "confirmed",
  "failed",
]);

// Common filter schema for blockchain operations
export const commonFiltersSchema = z.object({
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().min(0).optional(),
  tokenDenom: tokenDenomSchema.optional(),
  contractAddress: seiAddressSchema.optional(),
  blockRange: z
    .object({
      from: z.number().min(0).optional(),
      to: z.number().min(0).optional(),
    })
    .optional(),
  limit: z.number().min(1).max(1000).default(100),
});

// Standard transaction result schema
export const transactionResultSchema = z.object({
  txHash: z.string(),
  status: transactionStatusSchema,
  blockNumber: z.number().optional(),
  gasUsed: z.number().optional(),
  fees: z.number().optional(),
  error: z.string().optional(),
});

// NFT metadata schema
export const nftMetadataSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  image: z.string().url(),
  external_url: z.string().url().optional(),
  animation_url: z.string().url().optional(),
  attributes: z
    .array(
      z.object({
        trait_type: z.string(),
        value: z.union([z.string(), z.number(), z.boolean()]),
        display_type: z.string().optional(),
      })
    )
    .optional(),
});

// Wallet event schema
export const walletEventSchema = z.object({
  eventType: seiEventTypes,
  txHash: z.string(),
  blockNumber: z.number(),
  timestamp: z.string(),
  fromAddress: seiAddressSchema.optional(),
  toAddress: seiAddressSchema.optional(),
  amount: z.number().optional(),
  tokenDenom: tokenDenomSchema.optional(),
  contractAddress: seiAddressSchema.optional(),
  data: z.any().optional(),
  rawEvent: z.any(),
});

// Contract function parameter schema
export const contractParamSchema = z.object({
  name: z.string(),
  type: z.string(), // e.g., 'uint256', 'string', 'address'
  value: z.any(),
});

// Common Sei block categories
export const SEI_BLOCK_CATEGORIES = {
  TRIGGER: "trigger",
  ACTION: "action",
  DATA: "data",
} as const;

// Common error messages
export const SEI_ERROR_MESSAGES = {
  INVALID_ADDRESS: "Invalid Sei address format",
  INVALID_NETWORK: "Invalid Sei network",
  INSUFFICIENT_FUNDS: "Insufficient funds for transaction",
  CONTRACT_ERROR: "Smart contract execution failed",
  RPC_ERROR: "Failed to connect to Sei RPC endpoint",
  VALIDATION_ERROR: "Configuration validation failed",
} as const;

// Utility functions
export const validateSeiAddress = (address: string): boolean => {
  return SEI_ADDRESS_REGEX.test(address);
};

export const formatSeiAmount = (
  amount: number,
  decimals: number = 6
): string => {
  return (amount / Math.pow(10, decimals)).toFixed(decimals);
};

export const parseSeiAmount = (
  amount: string,
  decimals: number = 6
): number => {
  return Math.floor(parseFloat(amount) * Math.pow(10, decimals));
};
