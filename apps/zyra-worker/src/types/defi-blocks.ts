import { BlockType } from '@zyra/types';
/**
 * Types for DeFi block configurations and operations
 */

export enum DefiBlockType {
  PRICE_MONITOR = 'PRICE_MONITOR',
  YIELD_MONITOR = 'YIELD_MONITOR',
  PORTFOLIO_BALANCE = 'PORTFOLIO_BALANCE',
  REBALANCE_CALCULATOR = 'REBALANCE_CALCULATOR',
  SWAP_EXECUTOR = 'SWAP_EXECUTOR',
  GAS_OPTIMIZER = 'GAS_OPTIMIZER',
  PROTOCOL_MONITOR = 'PROTOCOL_MONITOR',
  YIELD_STRATEGY = 'YIELD_STRATEGY',
  LIQUIDITY_PROVIDER = 'LIQUIDITY_PROVIDER',
  POSITION_MANAGER = 'POSITION_MANAGER',
}

export interface DefiBlockConfig {
  type: DefiBlockType;
  rpcUrl?: string;
  networkId?: string;
  wallets?: string[];
  assets?: string[];
  protocols?: string[];
  threshold?: number;
  monitoringInterval?: number;
  yieldThreshold?: number;
  targetAllocation?: Record<string, number>;
  deviationThreshold?: number;
  sourceAsset?: string;
  targetAsset?: string;
  amount?: string | number;
  slippage?: number;
  gasLimit?: number;
  maxFee?: number;
  optimizationStrategy?: string;
  protocol?: string;
  healthThreshold?: number;
  strategy?: string;
  optimizationGoal?: string;
  poolAddress?: string;
  tokenA?: string;
  tokenB?: string;
  riskThreshold?: number;
  refreshInterval?: number;
  networks?: string[];
}

// Map from BlockType to DefiBlockType
export const blockTypeToDefiBlockType = {
  'defi-price-monitor': DefiBlockType.PRICE_MONITOR,
  'defi-yield-monitor': DefiBlockType.YIELD_MONITOR,
  'defi-portfolio-balance': DefiBlockType.PORTFOLIO_BALANCE,
  'defi-rebalance-calculator': DefiBlockType.REBALANCE_CALCULATOR,
  'defi-swap-executor': DefiBlockType.SWAP_EXECUTOR,
  'defi-gas-optimizer': DefiBlockType.GAS_OPTIMIZER,
  'defi-protocol-monitor': DefiBlockType.PROTOCOL_MONITOR,
  'defi-yield-strategy': DefiBlockType.YIELD_STRATEGY,
  'defi-liquidity-provider': DefiBlockType.LIQUIDITY_PROVIDER,
  'defi-position-manager': DefiBlockType.POSITION_MANAGER,
};
