import { z } from 'zod';
import type { EnhancedBlockSchema } from '../../blockSchemas';
import {
  standardInputSchema,
  seiNetworkSchema,
  seiAddressSchema,
  walletConfigSchema,
  gasSettingsSchema,
  transactionResultSchema,
  tokenDenomSchema,
  SEI_BLOCK_CATEGORIES,
} from './common';

/**
 * Sei Payment Block Schema
 * Sends payments on Sei blockchain with support for batch transactions
 */
export const seiPaymentSchema: EnhancedBlockSchema = {
  configSchema: z.object({
    network: seiNetworkSchema,
    paymentType: z.enum(['single', 'batch', 'scheduled']).default('single'),
    
    // Single payment config
    singlePayment: z.object({
      recipient: seiAddressSchema,
      amount: z.number().min(0),
      tokenDenom: tokenDenomSchema,
      memo: z.string().optional(),
    }).optional(),
    
    // Batch payments config
    batchPayments: z.array(z.object({
      recipient: seiAddressSchema,
      amount: z.number().min(0),
      tokenDenom: tokenDenomSchema,
      memo: z.string().optional(),
    })).min(1).max(100).optional(),
    
    // Scheduled payment config
    scheduledPayment: z.object({
      recipient: seiAddressSchema,
      amount: z.number().min(0),
      tokenDenom: tokenDenomSchema,
      memo: z.string().optional(),
      scheduleType: z.enum(['once', 'recurring']),
      executeAt: z.string().datetime().optional(), // For 'once'
      interval: z.number().min(3600).optional(), // For 'recurring' (seconds)
      maxExecutions: z.number().min(1).optional(), // For 'recurring'
    }).optional(),
    
    walletConfig: walletConfigSchema,
    gasSettings: gasSettingsSchema.optional(),
    
    // Advanced settings
    confirmationSettings: z.object({
      waitForConfirmation: z.boolean().default(true),
      confirmationTimeout: z.number().min(1000).max(300000).default(60000),
      requiredConfirmations: z.number().min(1).max(10).default(1),
    }).optional(),
    
    // Safety settings
    safetySettings: z.object({
      maxTotalAmount: z.number().min(0).optional(), // Max total amount per execution
      requireDoubleConfirmation: z.boolean().default(false),
      allowDuplicateRecipients: z.boolean().default(true),
    }).optional(),
    
    // Retry settings
    retrySettings: z.object({
      maxRetries: z.number().min(0).max(5).default(3),
      retryDelay: z.number().min(1000).max(60000).default(5000),
      retryOnFailure: z.boolean().default(true),
    }).optional(),
  }),

  inputSchema: standardInputSchema.extend({
    // Allow dynamic payment parameters from previous blocks
    dynamicPayments: z.array(z.object({
      recipient: seiAddressSchema,
      amount: z.number().min(0),
      tokenDenom: tokenDenomSchema.optional(),
      memo: z.string().optional(),
    })).optional(),
    // Allow dynamic amounts based on previous block outputs
    dynamicAmounts: z.record(z.number()).optional(),
    // Override gas settings
    gasOverride: gasSettingsSchema.partial().optional(),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    paymentType: z.string(),
    totalPayments: z.number(),
    successfulPayments: z.number(),
    failedPayments: z.number(),
    
    transactions: z.array(z.object({
      recipient: seiAddressSchema,
      amount: z.number(),
      tokenDenom: tokenDenomSchema,
      memo: z.string().optional(),
      transaction: transactionResultSchema,
      executionTime: z.number().optional(), // ms
    })),
    
    summary: z.object({
      totalAmount: z.number(),
      totalFees: z.number(),
      totalGasUsed: z.number(),
      averageExecutionTime: z.number(), // ms
      networkUsed: seiNetworkSchema,
    }),
    
    // Scheduled payment specific
    scheduledInfo: z.object({
      nextExecution: z.string().datetime().optional(),
      remainingExecutions: z.number().optional(),
      totalExecutions: z.number().optional(),
    }).optional(),
    
    // Batch processing info
    batchInfo: z.object({
      batchId: z.string(),
      processedAt: z.string(),
      processingTime: z.number(), // ms
    }).optional(),
    
    warnings: z.array(z.string()).optional(), // Non-fatal warnings
    error: z.string().optional(),
    timestamp: z.string(),
  }),

  metadata: {
    category: SEI_BLOCK_CATEGORIES.ACTION,
    icon: 'send',
    description: 'Send single or batch payments on Sei blockchain with advanced scheduling and safety features',
    tags: ['sei', 'payment', 'transfer', 'blockchain', 'send', 'batch', 'scheduled'],
  },
};

export type SeiPaymentConfig = z.infer<typeof seiPaymentSchema.configSchema>;
export type SeiPaymentInput = z.infer<typeof seiPaymentSchema.inputSchema>;
export type SeiPaymentOutput = z.infer<typeof seiPaymentSchema.outputSchema>;