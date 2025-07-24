import { z } from "zod";
import type { EnhancedBlockSchema } from "../../blockSchemas";
import {
  standardInputSchema,
  seiNetworkSchema,
  seiAddressSchema,
  tokenDenomSchema,
  commonFiltersSchema,
  SEI_BLOCK_CATEGORIES,
} from "./common";

/**
 * Sei Onchain Data Fetch Block Schema
 * Retrieves various types of data from Sei blockchain
 */
export const seiOnchainDataFetchSchema: EnhancedBlockSchema = {
  configSchema: z.object({
    network: seiNetworkSchema,
    dataType: z.enum([
      "balance",
      "token_balance",
      "nfts",
      "defi_positions",
      "tx_history",
      "contract_state",
      "delegations",
      "rewards",
      "governance_votes",
    ]),
    targetAddress: seiAddressSchema,

    // Balance-specific config
    balanceConfig: z
      .object({
        tokenDenom: tokenDenomSchema.optional(),
        includeStaked: z.boolean().default(false),
        includeRewards: z.boolean().default(false),
      })
      .optional(),

    // NFT-specific config
    nftConfig: z
      .object({
        collectionAddress: seiAddressSchema.optional(),
        includeMetadata: z.boolean().default(true),
        metadataFormat: z.enum(["json", "ipfs", "base64"]).default("json"),
      })
      .optional(),

    // Transaction history config
    txConfig: z
      .object({
        txType: z
          .enum(["send", "receive", "contract", "delegate", "all"])
          .default("all"),
        startTime: z.string().datetime().optional(),
        endTime: z.string().datetime().optional(),
        includeFailedTx: z.boolean().default(false),
      })
      .optional(),

    // Contract state config
    contractConfig: z
      .object({
        contractAddress: seiAddressSchema,
        queryMethod: z.string(),
        queryParams: z.record(z.string(), z.any()).optional(),
      })
      .optional(),

    // DeFi positions config
    defiConfig: z
      .object({
        protocols: z.array(z.string()).optional(), // ['dex', 'lending', 'staking']
        includeRewards: z.boolean().default(true),
        includeHistory: z.boolean().default(false),
      })
      .optional(),

    filters: commonFiltersSchema.optional(),
    cacheResults: z.boolean().default(true),
    cacheTtl: z.number().min(1000).max(3600000).default(60000), // 1s to 1h
  }),

  inputSchema: standardInputSchema.extend({
    // Allow dynamic address from previous blocks
    dynamicAddress: seiAddressSchema.optional(),
    // Allow dynamic query parameters
    dynamicParams: z.record(z.string(), z.any()).optional(),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    dataType: z.string(),
    address: seiAddressSchema,
    network: seiNetworkSchema,
    data: z.any(), // Flexible data structure based on dataType

    // Balance-specific output
    balance: z
      .object({
        available: z.number(),
        staked: z.number().optional(),
        rewards: z.number().optional(),
        total: z.number(),
        denom: tokenDenomSchema,
      })
      .optional(),

    // NFT-specific output
    nfts: z
      .array(
        z.object({
          tokenId: z.string(),
          contractAddress: seiAddressSchema,
          name: z.string().optional(),
          description: z.string().optional(),
          image: z.string().optional(),
          metadata: z.any().optional(),
        })
      )
      .optional(),

    // Transaction history output
    transactions: z
      .array(
        z.object({
          txHash: z.string(),
          type: z.string(),
          status: z.enum(["success", "failed"]),
          blockHeight: z.number(),
          timestamp: z.string(),
          from: seiAddressSchema.optional(),
          to: seiAddressSchema.optional(),
          amount: z.number().optional(),
          fee: z.number().optional(),
          memo: z.string().optional(),
        })
      )
      .optional(),

    // Contract state output
    contractState: z.any().optional(),

    // DeFi positions output
    defiPositions: z
      .array(
        z.object({
          protocol: z.string(),
          type: z.string(), // 'liquidity', 'lending', 'staking'
          amount: z.number(),
          value: z.number().optional(),
          rewards: z.number().optional(),
        })
      )
      .optional(),

    metadata: z.object({
      blockHeight: z.number(),
      fetchTime: z.string(),
      cached: z.boolean(),
      ttl: z.number().optional(),
    }),
    error: z.string().optional(),
    timestamp: z.string(),
  }),

  metadata: {
    category: SEI_BLOCK_CATEGORIES.DATA,
    icon: "database",
    description:
      "Fetch comprehensive onchain data from Sei blockchain including balances, NFTs, and transaction history",
    tags: [
      "sei",
      "data",
      "fetch",
      "blockchain",
      "query",
      "balance",
      "nft",
      "defi",
    ],
  },
};

export type SeiOnchainDataFetchConfig = z.infer<
  typeof seiOnchainDataFetchSchema.configSchema
>;
export type SeiOnchainDataFetchInput = z.infer<
  typeof seiOnchainDataFetchSchema.inputSchema
>;
export type SeiOnchainDataFetchOutput = z.infer<
  typeof seiOnchainDataFetchSchema.outputSchema
>;
