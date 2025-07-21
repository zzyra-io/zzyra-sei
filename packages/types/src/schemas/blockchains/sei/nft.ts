import { z } from 'zod';
import type { EnhancedBlockSchema } from '../../blockSchemas';
import {
  standardInputSchema,
  seiNetworkSchema,
  seiAddressSchema,
  walletConfigSchema,
  gasSettingsSchema,
  transactionResultSchema,
  nftMetadataSchema,
  walletEventSchema,
  seiEventTypes,
  SEI_BLOCK_CATEGORIES,
} from './common';

/**
 * Sei NFT Block Schema
 * Handles NFT operations: monitoring, minting, and transferring on Sei blockchain
 */
export const seiNftSchema: EnhancedBlockSchema = {
  configSchema: z.object({
    network: seiNetworkSchema,
    operation: z.enum(['monitor', 'mint', 'transfer', 'burn', 'batch_transfer']),
    contractAddress: seiAddressSchema.optional(), // Required for mint/transfer/burn operations
    
    // Monitor-specific config
    monitorConfig: z.object({
      walletAddress: seiAddressSchema,
      eventTypes: z.array(z.enum(['mint', 'transfer', 'burn', 'sale', 'approval'])).min(1),
      contractAddresses: z.array(seiAddressSchema).optional(), // Monitor specific contracts
      includeMetadata: z.boolean().default(true),
      pollingInterval: z.number().min(5000).max(300000).default(30000),
      maxEventsPerPoll: z.number().min(1).max(100).default(50),
    }).optional(),
    
    // Mint-specific config
    mintConfig: z.object({
      metadata: nftMetadataSchema,
      recipient: seiAddressSchema,
      tokenId: z.string().optional(), // If not provided, will be auto-generated
      royalties: z.object({
        recipient: seiAddressSchema,
        percentage: z.number().min(0).max(100), // 0-100%
      }).optional(),
      mintQuantity: z.number().min(1).max(1000).default(1), // For batch minting
    }).optional(),
    
    // Transfer-specific config  
    transferConfig: z.object({
      tokenIds: z.array(z.string()).min(1).max(100), // Support batch transfers
      recipient: seiAddressSchema,
      memo: z.string().optional(),
      approveFirst: z.boolean().default(true), // Auto-approve before transfer
    }).optional(),
    
    // Burn-specific config
    burnConfig: z.object({
      tokenIds: z.array(z.string()).min(1).max(100),
      reason: z.string().optional(),
    }).optional(),
    
    // Batch transfer config
    batchTransferConfig: z.object({
      transfers: z.array(z.object({
        tokenId: z.string(),
        recipient: seiAddressSchema,
        memo: z.string().optional(),
      })).min(1).max(100),
    }).optional(),
    
    walletConfig: walletConfigSchema.optional(), // Not needed for monitor
    gasSettings: gasSettingsSchema.optional(),
    
    // Advanced settings
    advancedSettings: z.object({
      waitForConfirmation: z.boolean().default(true),
      confirmationTimeout: z.number().min(1000).max(300000).default(60000),
      includeEvents: z.boolean().default(true), // Include contract events in output
      metadataStorage: z.enum(['ipfs', 'arweave', 'centralized']).default('ipfs'),
    }).optional(),
  }),

  inputSchema: standardInputSchema.extend({
    // Allow dynamic NFT operations from previous blocks
    dynamicTokenIds: z.array(z.string()).optional(),
    dynamicRecipient: seiAddressSchema.optional(),
    dynamicMetadata: nftMetadataSchema.optional(),
    // Override gas settings
    gasOverride: gasSettingsSchema.partial().optional(),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    operation: z.string(),
    contractAddress: seiAddressSchema.optional(),
    network: seiNetworkSchema,
    
    // Monitor operation output
    monitorResult: z.object({
      events: z.array(walletEventSchema),
      totalEvents: z.number(),
      lastProcessedBlock: z.number(),
      nextPollTime: z.string(),
    }).optional(),
    
    // Mint operation output
    mintResult: z.object({
      tokenIds: z.array(z.string()),
      recipient: seiAddressSchema,
      transaction: transactionResultSchema,
      metadata: nftMetadataSchema,
      metadataUri: z.string().optional(),
      totalMinted: z.number(),
    }).optional(),
    
    // Transfer operation output
    transferResult: z.object({
      tokenIds: z.array(z.string()),
      fromAddress: seiAddressSchema,
      toAddress: seiAddressSchema,
      transactions: z.array(transactionResultSchema),
      totalTransferred: z.number(),
    }).optional(),
    
    // Burn operation output
    burnResult: z.object({
      tokenIds: z.array(z.string()),
      burnerAddress: seiAddressSchema,
      transaction: transactionResultSchema,
      totalBurned: z.number(),
    }).optional(),
    
    // Batch transfer output
    batchTransferResult: z.object({
      transfers: z.array(z.object({
        tokenId: z.string(),
        recipient: seiAddressSchema,
        transaction: transactionResultSchema,
        success: z.boolean(),
      })),
      successfulTransfers: z.number(),
      failedTransfers: z.number(),
      batchTransaction: transactionResultSchema.optional(),
    }).optional(),
    
    // Common output fields
    gasUsed: z.number().optional(),
    executionTime: z.number().optional(), // ms
    contractEvents: z.array(z.object({
      eventName: z.string(),
      data: z.any(),
      blockNumber: z.number(),
      txHash: z.string(),
    })).optional(),
    
    warnings: z.array(z.string()).optional(),
    error: z.string().optional(),
    timestamp: z.string(),
  }),

  metadata: {
    category: SEI_BLOCK_CATEGORIES.ACTION,
    icon: 'image',
    description: 'Comprehensive NFT operations on Sei blockchain including monitoring, minting, transferring, and burning',
    tags: ['sei', 'nft', 'token', 'blockchain', 'mint', 'transfer', 'burn', 'monitor'],
  },
};

export type SeiNftConfig = z.infer<typeof seiNftSchema.configSchema>;
export type SeiNftInput = z.infer<typeof seiNftSchema.inputSchema>;
export type SeiNftOutput = z.infer<typeof seiNftSchema.outputSchema>;