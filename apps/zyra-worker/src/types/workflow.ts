import { 
  BlockType as SharedBlockType, 
  BlockExecutionContext as SharedBlockExecutionContext,
  NodeCategory as SharedNodeCategory,
  BlockMetadata as SharedBlockMetadata, 
  getCategoryColor as sharedGetCategoryColor,
  getBlockMetadata as sharedGetBlockMetadata,
  getBlockType as sharedGetBlockType
} from '@zyra/types';

// Re-export the shared types for backward compatibility
export type BlockExecutionContext = SharedBlockExecutionContext;

// Workflow graph node structure
export interface Node {
  id: string;
  type: string;
  data: {
    blockId?: string;
    inputs?: Record<string, any>;
    config?: Record<string, any>;
    [key: string]: any;
  };
}

// Workflow graph edge structure
export interface Edge {
  id: string;
  source: string;
  target: string;
}

// Use the shared BlockType enum and re-export for backward compatibility
export type BlockType = SharedBlockType;
export const BlockType = SharedBlockType;

// Use shared NodeCategory
export type NodeCategory = SharedNodeCategory;
export const NodeCategory = SharedNodeCategory;

// Use shared BlockMetadata interface
export type BlockMetadata = SharedBlockMetadata;

// Block catalog definition with metadata for each block type
// Cast to any to avoid type issues during migration
export const BLOCK_CATALOG: Record<string, BlockMetadata> = {
  [BlockType.PRICE_MONITOR]: {
    type: BlockType.PRICE_MONITOR,
    label: 'Price Monitor',
    description: 'Monitor cryptocurrency prices',
    category: NodeCategory.TRIGGER,
    icon: 'price-monitor',
    defaultConfig: {
      asset: 'ETHEREUM',
      condition: 'above',
      targetPrice: '2000',
      checkInterval: '5',
    },
  },
  [BlockType.SCHEDULE]: {
    type: BlockType.SCHEDULE,
    label: 'Schedule',
    description: 'Trigger workflow on a schedule',
    category: NodeCategory.TRIGGER,
    icon: 'schedule',
    defaultConfig: {
      interval: 'hourly',
      time: '09:00',
    },
  },
  [BlockType.WEBHOOK]: {
    type: BlockType.WEBHOOK,
    label: 'Webhook',
    description: 'Trigger via HTTP webhook',
    category: NodeCategory.TRIGGER,
    icon: 'webhook',
    defaultConfig: {
      method: 'POST',
      url: '',
    },
  },
  [BlockType.EMAIL]: {
    type: BlockType.EMAIL,
    label: 'Send Email',
    description: 'Send an email notification',
    category: NodeCategory.ACTION,
    icon: 'email',
    defaultConfig: {
      to: '',
      subject: 'Workflow Notification',
      body: '',
    },
  },
  [BlockType.NOTIFICATION]: {
    type: BlockType.NOTIFICATION,
    label: 'Notification',
    description: 'Send a notification',
    category: NodeCategory.ACTION,
    icon: 'notification',
    defaultConfig: {
      type: 'info',
      title: '',
      message: '',
    },
  },
  [BlockType.DISCORD]: {
    type: BlockType.DISCORD,
    label: 'Discord',
    description: 'Send a Discord message',
    category: NodeCategory.ACTION,
    icon: 'discord',
    defaultConfig: {
      webhookUrl: '',
      message: '',
    },
  },
  [BlockType.DATABASE]: {
    type: BlockType.DATABASE,
    label: 'Database',
    description: 'Interact with database',
    category: NodeCategory.ACTION,
    icon: 'database',
    defaultConfig: {
      operation: 'select',
      table: '',
    },
  },
  [BlockType.WALLET]: {
    type: BlockType.WALLET,
    label: 'Wallet',
    description: 'Wallet operations',
    category: NodeCategory.ACTION,
    icon: 'wallet',
    defaultConfig: {
      blockchain: 'ethereum',
      operation: 'connect',
    },
  },
  [BlockType.TRANSACTION]: {
    type: BlockType.TRANSACTION,
    label: 'Transaction',
    description: 'Execute blockchain transaction',
    category: NodeCategory.ACTION,
    icon: 'transaction',
    defaultConfig: {
      blockchain: 'ethereum',
      type: 'transfer',
    },
  },
  [BlockType.CONDITION]: {
    type: BlockType.CONDITION,
    label: 'Condition',
    description: 'Branch based on condition',
    category: NodeCategory.LOGIC,
    icon: 'condition',
    defaultConfig: {
      type: 'simple',
      condition: '',
    },
  },
  [BlockType.DELAY]: {
    type: BlockType.DELAY,
    label: 'Delay',
    description: 'Add delay between steps',
    category: NodeCategory.LOGIC,
    icon: 'delay',
    defaultConfig: {
      duration: '5',
      unit: 'minutes',
    },
  },
  [BlockType.TRANSFORM]: {
    type: BlockType.TRANSFORM,
    label: 'Transform',
    description: 'Transform data format',
    category: NodeCategory.LOGIC,
    icon: 'transform',
    defaultConfig: {
      transformType: 'javascript',
      code: '',
    },
  },
  [BlockType.AI_BLOCKCHAIN]: {
    type: BlockType.AI_BLOCKCHAIN,
    label: 'AI Blockchain',
    description: 'Execute blockchain operations via AI',
    category: NodeCategory.FINANCE,
    icon: 'ai-blockchain',
    defaultConfig: {
      operation: 'balance',
      blockchain: 'ethereum',
    },
  },
  [BlockType.CUSTOM]: {
    type: BlockType.CUSTOM,
    label: 'Custom Block',
    description: 'User-defined custom block',
    category: NodeCategory.ACTION,
    icon: 'custom-block',
    defaultConfig: {},
  },
  [BlockType.LLM_PROMPT]: {
    type: BlockType.LLM_PROMPT,
    label: 'LLM Prompt',
    description: 'Generate text via LLM',
    category: NodeCategory.ACTION,
    icon: 'ai',
    defaultConfig: {
      promptTemplate: '',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 256,
      stream: false,
    },
  },
  [BlockType.DEFI_PRICE_MONITOR]: {
    type: BlockType.DEFI_PRICE_MONITOR,
    label: 'DeFi Price Monitor',
    description: 'Monitor prices of DeFi tokens and assets',
    category: NodeCategory.FINANCE,
    icon: 'chart-line',
    defaultConfig: {
      asset: 'ETH',
      condition: 'above',
      targetPrice: '2000',
      checkInterval: '5',
    },
  },
  [BlockType.DEFI_YIELD_MONITOR]: {
    type: BlockType.DEFI_YIELD_MONITOR,
    label: 'Yield Monitor',
    description: 'Monitor yield rates across protocols',
    category: NodeCategory.FINANCE,
    icon: 'chart-bar',
    defaultConfig: {
      protocols: ['aave', 'compound'],
      assets: ['USDC', 'DAI', 'ETH'],
      threshold: 5,
      refreshInterval: 60
    },
  },
  [BlockType.DEFI_PORTFOLIO]: {
    type: BlockType.DEFI_PORTFOLIO,
    label: 'DeFi Portfolio',
    description: 'Monitor and manage DeFi portfolio',
    category: NodeCategory.FINANCE,
    icon: 'portfolio',
    defaultConfig: {
      type: 'portfolio_balance',
      assets: ['ETH', 'BTC', 'USDC'],
      protocols: ['aave', 'compound'],
      monitoringInterval: 60
    },
  },
  [BlockType.DEFI_REBALANCE]: {
    type: BlockType.DEFI_REBALANCE,
    label: 'Portfolio Rebalancer',
    description: 'Calculate portfolio rebalancing',
    category: NodeCategory.FINANCE,
    icon: 'rebalance',
    defaultConfig: {
      type: 'rebalance_calculator',
      targetAllocation: {
        ETH: 40,
        BTC: 30,
        USDC: 30
      },
      rebalanceThreshold: 5,
      maxSlippage: 0.5
    },
  },
  [BlockType.DEFI_SWAP]: {
    type: BlockType.DEFI_SWAP,
    label: 'Token Swap',
    description: 'Execute token swaps',
    category: NodeCategory.FINANCE,
    icon: 'swap',
    defaultConfig: {
      type: 'swap_executor',
      sourceAsset: 'ETH',
      targetAsset: 'USDC',
      amount: '0.1',
      slippage: 0.5,
      gasLimit: 250000,
      maxFee: 50
    },
  },
  [BlockType.DEFI_YIELD_STRATEGY]: {
    type: BlockType.DEFI_YIELD_STRATEGY,
    label: 'Yield Strategy',
    description: 'Execute yield farming strategies',
    category: NodeCategory.FINANCE,
    icon: 'strategy',
    defaultConfig: {
      type: 'yield_strategy',
      strategy: 'conservative',
      assets: ['USDC', 'DAI'],
      protocols: ['aave', 'compound'],
      optimizationGoal: 'balanced'
    },
  },
  [BlockType.DEFI_PROTOCOL]: {
    type: BlockType.DEFI_PROTOCOL,
    label: 'Protocol Monitor',
    description: 'Monitor DeFi protocol health',
    category: NodeCategory.FINANCE,
    icon: 'protocol',
    defaultConfig: {
      type: 'protocol_monitor',
      protocol: 'aave',
      monitoringInterval: 60,
      healthThreshold: 80
    },
  },
  [BlockType.DEFI_GAS]: {
    type: BlockType.DEFI_GAS,
    label: 'Gas Optimizer',
    description: 'Optimize gas for transactions',
    category: NodeCategory.FINANCE,
    icon: 'gas',
    defaultConfig: {
      type: 'gas_optimizer',
      gasLimit: 250000,
      maxFee: 50,
      optimizationStrategy: 'gas_price'
    },
  },
  [BlockType.DEFI_LIQUIDITY]: {
    type: BlockType.DEFI_LIQUIDITY,
    label: 'Liquidity Provider',
    description: 'Manage liquidity pools',
    category: NodeCategory.FINANCE,
    icon: 'liquidity',
    defaultConfig: {
      type: 'liquidity_provider',
      poolAddress: '',
      tokenA: 'ETH',
      tokenB: 'USDC',
      amount: '0.1',
      slippage: 0.5
    },
  },
  [BlockType.DEFI_POSITION]: {
    type: BlockType.DEFI_POSITION,
    label: 'Position Manager',
    description: 'Manage and monitor positions',
    category: NodeCategory.FINANCE,
    icon: 'position',
    defaultConfig: {
      type: 'position_manager',
      assets: ['ETH', 'BTC', 'USDC'],
      protocols: ['aave', 'compound'],
      riskThreshold: 70,
      monitoringInterval: 60
    },
  },
  [BlockType.UNKNOWN]: {
    type: BlockType.UNKNOWN,
    label: 'Unknown Block',
    description: 'Block with unknown type',
    category: NodeCategory.ACTION,
    icon: 'unknown',
    defaultConfig: {},
  },
};

// Forward shared helper functions but with our local BLOCK_CATALOG for UI-specific metadata
export const getBlockMetadata = (blockType: BlockType | string): BlockMetadata => {
  // Use our local BLOCK_CATALOG for UI-specific metadata
  // If it's already a BlockType enum, use it directly
  if (Object.values(BlockType).includes(blockType as BlockType)) {
    return BLOCK_CATALOG[blockType as BlockType];
  }

  // Try to find a matching block type
  const normalizedType = (blockType || '').toLowerCase().replace(/_/g, '-');
  const matchedType = Object.values(BlockType).find(
    (type) => type === normalizedType,
  );

  if (matchedType) {
    return BLOCK_CATALOG[matchedType];
  }

  // Return unknown block type if no match found
  return BLOCK_CATALOG[BlockType.UNKNOWN];
};

// Re-export shared category color function
export const getCategoryColor = sharedGetCategoryColor;

// Re-export shared getBlockType function with minor worker-specific adjustments if needed
export const getBlockType = (data: any): BlockType => {
  return sharedGetBlockType(data);
};
