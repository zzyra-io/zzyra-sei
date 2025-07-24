import { z } from "zod";
import type { EnhancedBlockSchema } from "../../blockSchemas";
import {
  standardInputSchema,
  seiNetworkSchema,
  seiAddressSchema,
  walletConfigSchema,
  gasSettingsSchema,
  transactionResultSchema,
  contractParamSchema,
  SEI_BLOCK_CATEGORIES,
} from "./common";

/**
 * Sei Smart Contract Call Block Schema
 * Executes smart contract functions on Sei blockchain
 */
export const seiSmartContractCallSchema: EnhancedBlockSchema = {
  configSchema: z.object({
    network: seiNetworkSchema,
    contractAddress: seiAddressSchema,
    functionName: z.string().min(1),
    functionParams: z.array(contractParamSchema).optional(),
    abi: z.string().optional(), // JSON ABI string
    functionSignature: z.string().optional(), // Alternative to ABI for simple calls
    walletConfig: walletConfigSchema,
    gasSettings: gasSettingsSchema.optional(),
    value: z.number().min(0).default(0), // SEI amount to send with transaction
    memo: z.string().optional(),
    waitForConfirmation: z.boolean().default(true),
    confirmationTimeout: z.number().min(1000).max(300000).default(60000), // 1s to 5min
  }),

  inputSchema: standardInputSchema.extend({
    // Allow dynamic function parameters from previous blocks
    dynamicParams: z.record(z.string(), z.any()).optional(),
    // Allow overriding gas settings
    gasOverride: gasSettingsSchema.partial().optional(),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    transaction: transactionResultSchema,
    contractAddress: seiAddressSchema,
    functionName: z.string(),
    returnData: z.any().optional(), // Contract function return value
    events: z
      .array(
        z.object({
          eventName: z.string(),
          data: z.any(),
        })
      )
      .optional(), // Contract events emitted
    gasEstimate: z.number().optional(),
    actualGasUsed: z.number().optional(),
    executionTime: z.number().optional(), // ms
    confirmationTime: z.number().optional(), // ms
    error: z.string().optional(),
    timestamp: z.string(),
  }),

  metadata: {
    category: SEI_BLOCK_CATEGORIES.ACTION,
    icon: "code",
    description:
      "Execute smart contract functions on Sei blockchain with secure wallet integration",
    tags: [
      "sei",
      "contract",
      "call",
      "blockchain",
      "execute",
      "smart-contract",
    ],
  },
};

export type SeiSmartContractCallConfig = z.infer<
  typeof seiSmartContractCallSchema.configSchema
>;
export type SeiSmartContractCallInput = z.infer<
  typeof seiSmartContractCallSchema.inputSchema
>;
export type SeiSmartContractCallOutput = z.infer<
  typeof seiSmartContractCallSchema.outputSchema
>;
