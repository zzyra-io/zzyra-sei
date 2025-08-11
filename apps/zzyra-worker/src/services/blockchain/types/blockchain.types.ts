/**
 * Shared blockchain types and interfaces
 * Used across all blockchain services for consistency
 */

export interface TransactionRequest {
  to: string;
  value: string;
  data?: string;
  chainId: number;
  gasLimit?: number;
}

export interface TransactionResult {
  hash: string;
  success: boolean;
  gasUsed?: string;
  blockNumber?: number;
  status: 'success' | 'failed';
  explorerUrl?: string;
  error?: string;
}

export interface GasEstimate {
  callGasLimit?: string;
  verificationGasLimit?: string;
  preVerificationGas?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

export interface ChainConfig {
  id: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  testnet?: boolean;
}

export interface WalletConfig {
  address: string;
  privateKey?: string;
  chainId: number;
}

export interface SessionKeyConfig {
  sessionPrivateKey: string;
  smartWalletAddress: string;
  chainId: number;
  permissions: {
    operations: string[];
    maxAmountPerTx: string;
    maxDailyAmount: string;
    validUntil: Date;
  };
}

export interface UserOperation {
  sender: string;
  nonce: string;
  initCode: string;
  callData: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  paymasterAndData: string;
  signature: string;
}

export interface SmartAccountConfig {
  ownerPrivateKey: string;
  chainId: number;
  delegationMode?: 'immediate' | 'delegated' | 'hybrid';
}

export interface SmartAccountInfo {
  smartAccountAddress: string;
  ownerAddress: string;
  chainId: number;
  delegationMode: string;
  deploymentRequired: boolean;
  smartAccountClient?: any;
}

export type BlockchainNetwork =
  | 'ethereum'
  | 'polygon'
  | 'base'
  | 'sei'
  | 'arbitrum'
  | 'optimism';

export type TransactionType =
  | 'native_transfer'
  | 'erc20_transfer'
  | 'contract_interaction'
  | 'smart_account_deployment';

export interface BlockchainServiceConfig {
  chainId: number;
  rpcUrl?: string;
  apiKey?: string;
  bundlerUrl?: string;
  paymasterUrl?: string;
}
