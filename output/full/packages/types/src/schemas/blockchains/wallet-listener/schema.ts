// packages/types/src/schemas/wallet-listener.ts

import { z } from "zod";
import { EnhancedBlockSchema } from "../../blockSchemas";

/**
 * Network-agnostic Wallet Listener block schema definition
 */
export const walletListenerSchema: EnhancedBlockSchema = {
  configSchema: z.object({
    network: z.enum(["sei", "ethereum", "polygon", "solana"]), // Extend as needed
    walletAddresses: z.array(z.string().min(1, "Wallet address required")),
    eventTypes: z.array(
      z.string().min(1, "Event type required")
      // Optionally, use z.enum([...]) if you want to restrict per network
    ),
    minAmount: z.number().min(0).optional().default(0),
    tokenDenom: z.string().optional(),
    pollInterval: z.number().min(5).max(600).default(30),
    startBlock: z.number().optional(),
    description: z.string().optional(),
  }),
  inputSchema: z.object({
    data: z.any().optional(),
    context: z
      .object({
        workflowId: z.string(),
        executionId: z.string(),
        userId: z.string(),
        timestamp: z.string(),
      })
      .optional(),
    variables: z.record(z.string(), z.any()).optional(),
  }),
  outputSchema: z.object({
    eventType: z.string(),
    txHash: z.string(),
    blockNumber: z.number(),
    timestamp: z.string(),
    fromAddress: z.string(),
    toAddress: z.string(),
    amount: z.number(),
    tokenDenom: z.string(),
    rawEvent: z.any(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  metadata: {
    category: "trigger",
    icon: "activity",
    description:
      "Triggers workflow when specified wallet(s) receive onchain events across supported networks.",
    tags: [
      "wallet",
      "listener",
      "trigger",
      "blockchain",
      "event",
      "multi-chain",
    ],
  },
};

// Type exports
export type WalletListenerConfig = z.infer<
  typeof walletListenerSchema.configSchema
>;
export type WalletListenerInput = z.infer<
  typeof walletListenerSchema.inputSchema
>;
export type WalletListenerOutput = z.infer<
  typeof walletListenerSchema.outputSchema
>;
