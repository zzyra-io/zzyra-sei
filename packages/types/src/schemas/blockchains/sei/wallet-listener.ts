import { z } from 'zod';
import type { EnhancedBlockSchema } from '../../blockSchemas';
import {
  standardInputSchema,
  seiNetworkSchema,
  seiAddressSchema,
  seiEventTypes,
  commonFiltersSchema,
  walletEventSchema,
  SEI_BLOCK_CATEGORIES,
} from './common';

/**
 * Sei Wallet Listener Block Schema
 * Monitors wallet activities on Sei blockchain and triggers workflows
 */
export const seiWalletListenerSchema: EnhancedBlockSchema = {
  configSchema: z.object({
    network: seiNetworkSchema,
    walletAddresses: z.array(seiAddressSchema).min(1).max(10),
    eventTypes: z.array(seiEventTypes).min(1),
    filters: commonFiltersSchema.optional(),
    pollingInterval: z.number().min(5000).max(300000).default(30000), // 5s to 5min
    maxEventsPerPoll: z.number().min(1).max(100).default(50),
    includeRawEvents: z.boolean().default(false),
  }),

  inputSchema: standardInputSchema,

  outputSchema: z.object({
    success: z.boolean(),
    events: z.array(walletEventSchema),
    totalEvents: z.number(),
    lastProcessedBlock: z.number().optional(),
    network: seiNetworkSchema,
    pollingTimestamp: z.string(),
    nextPollTime: z.string().optional(),
    error: z.string().optional(),
    timestamp: z.string(),
  }),

  metadata: {
    category: SEI_BLOCK_CATEGORIES.TRIGGER,
    icon: 'wallet',
    description: 'Monitor Sei wallet activities and trigger workflows on specific events',
    tags: ['sei', 'wallet', 'monitor', 'trigger', 'blockchain', 'events'],
  },
};

export type SeiWalletListenerConfig = z.infer<typeof seiWalletListenerSchema.configSchema>;
export type SeiWalletListenerInput = z.infer<typeof seiWalletListenerSchema.inputSchema>;
export type SeiWalletListenerOutput = z.infer<typeof seiWalletListenerSchema.outputSchema>;