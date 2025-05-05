export enum DefiBlockType {
  PRICE_MONITOR = 'price_monitor',
  YIELD_MONITOR = 'yield_monitor',
  PORTFOLIO_BALANCE = 'portfolio_balance',
  REBALANCE_CALCULATOR = 'rebalance_calculator',
  SWAP_EXECUTOR = 'swap_executor',
  GAS_OPTIMIZER = 'gas_optimizer',
  PROTOCOL_MONITOR = 'protocol_monitor',
  YIELD_STRATEGY = 'yield_strategy',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  POSITION_MANAGER = 'position_manager'
}

export interface DefiBlockConfig {
  type: DefiBlockType;
  protocol?: string;
  assets?: string[];
  threshold?: number;
  slippage?: number;
  gasLimit?: number;
  maxFee?: number;
  rebalancePercentage?: number;
  yieldStrategy?: string;
  monitoringInterval?: number;
}

export interface PriceMonitorConfig extends DefiBlockConfig {
  type: DefiBlockType.PRICE_MONITOR;
  assets: string[];
  threshold: number;
  monitoringInterval: number;
}

export interface YieldMonitorConfig extends DefiBlockConfig {
  type: DefiBlockType.YIELD_MONITOR;
  protocol: string;
  assets: string[];
  monitoringInterval: number;
  yieldThreshold: number;
}

export interface PortfolioBalanceConfig extends DefiBlockConfig {
  type: DefiBlockType.PORTFOLIO_BALANCE;
  assets: string[];
  protocols: string[];
  monitoringInterval: number;
}

export interface RebalanceCalculatorConfig extends DefiBlockConfig {
  type: DefiBlockType.REBALANCE_CALCULATOR;
  targetWeights: Record<string, number>;
  rebalanceThreshold: number;
  slippage: number;
}

export interface SwapExecutorConfig extends DefiBlockConfig {
  type: DefiBlockType.SWAP_EXECUTOR;
  sourceAsset: string;
  targetAsset: string;
  amount: string;
  slippage: number;
  gasLimit: number;
  maxFee: number;
}

export interface GasOptimizerConfig extends DefiBlockConfig {
  type: DefiBlockType.GAS_OPTIMIZER;
  gasLimit: number;
  maxFee: number;
  optimizationStrategy: 'gas_price' | 'block_time' | 'network_load';
}

export interface ProtocolMonitorConfig extends DefiBlockConfig {
  type: DefiBlockType.PROTOCOL_MONITOR;
  protocol: string;
  monitoringInterval: number;
  healthThreshold: number;
}

export interface YieldStrategyConfig extends DefiBlockConfig {
  type: DefiBlockType.YIELD_STRATEGY;
  strategy: string;
  assets: string[];
  protocols: string[];
  optimizationGoal: 'max_yield' | 'min_risk' | 'balanced';
}

export interface LiquidityProviderConfig extends DefiBlockConfig {
  type: DefiBlockType.LIQUIDITY_PROVIDER;
  poolAddress: string;
  tokenA: string;
  tokenB: string;
  amount: string;
  slippage: number;
}

export interface PositionManagerConfig extends DefiBlockConfig {
  type: DefiBlockType.POSITION_MANAGER;
  assets: string[];
  protocols: string[];
  riskThreshold: number;
  monitoringInterval: number;
}
