import { BlockType } from '@zzyra/types';
export enum DefiBlockType {
  SCHEDULE = 'schedule',
  PRICE_MONITOR = 'price-monitor',
  YIELD_MONITOR = 'yield-monitor',
  PORTFOLIO_BALANCE = 'portfolio-balance',
  REBALANCE_CALCULATOR = 'rebalance-calculator',
  SWAP_EXECUTOR = 'swap-executor',
  GAS_OPTIMIZER = 'gas-optimizer',
  PROTOCOL_MONITOR = 'protocol-monitor',
  YIELD_STRATEGY = 'yield-strategy',
  LIQUIDITY_PROVIDER = 'liquidity-provider',
  POSITION_MANAGER = 'position-manager',
  SWAP = 'swap',
  LIQUIDITY = 'liquidity',
  YIELD = 'yield',
  REBALANCE = 'rebalance',
  ALERT = 'alert',
}

export interface DefiBlockConfig {
  type?: DefiBlockType;
  protocol?: string;
  sourceAsset?: string;
  targetAsset?: string;
  amount?: string;
  slippage?: number;
  gasLimit?: number;
  maxFee?: number;
  poolAddress?: string;
  tokenA?: string;
  tokenB?: string;
  minAmountA?: string;
  minAmountB?: string;
  yieldThreshold?: number;
  targetWeights?: { [key: string]: number };
  rebalanceThreshold?: number;
  healthThreshold?: number;
  protocols?: string[];
  assets?: string[];
  threshold?: number;
  monitoringInterval?: number;
  optimizationStrategy?: string;
  strategy?: string;
  optimizationGoal?: string;
  riskThreshold?: number;
}

export interface DefiWorkflowConfig {
  nodes: {
    [key: string]: {
      type: DefiBlockType;
      config: DefiBlockConfig;
    };
  };
  edges: {
    from: string;
    to: string;
  }[];
}
