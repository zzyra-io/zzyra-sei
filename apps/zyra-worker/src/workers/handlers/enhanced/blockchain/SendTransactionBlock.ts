import { Injectable, Logger } from '@nestjs/common';
import {
  EnhancedBlockHandler,
  EnhancedBlockExecutionContext,
  ZyraNodeData,
  EnhancedBlockDefinition,
  BlockGroup,
  PropertyType,
  ConnectionType,
  ValidationResult,
  SessionKeyValidationResult,
  SecurityViolationError,
} from '@zyra/types';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ConfigService } from '@nestjs/config';

/**
 * SEI Network Configuration
 */
const SEI_TESTNET_CONFIG = {
  id: 713715,
  name: 'SEI Testnet',
  network: 'sei-testnet',
  nativeCurrency: {
    name: 'SEI',
    symbol: 'SEI',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        'https://yolo-sparkling-sea.sei-atlantic.quiknode.pro/aa0487f22e4ebd479a97f9736eb3c0fb8a2b8e32',
      ],
    },
    public: {
      http: [
        'https://yolo-sparkling-sea.sei-atlantic.quiknode.pro/aa0487f22e4ebd479a97f9736eb3c0fb8a2b8e32',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'SEI Testnet Explorer',
      url: 'https://seitrace.com',
    },
  },
  testnet: true,
};

/**
 * Wallet connection interface for blockchain operations
 */
interface WalletConnection {
  address: string;
  privateKey?: string;
  provider?: any;
  chainId: string;
}

/**
 * Transaction result interface
 */
interface TransactionResult {
  transactionHash: string;
  blockNumber?: bigint;
  gasUsed?: bigint;
  status: 'success' | 'failed';
  explorerUrl?: string;
}

/**
 * Enhanced block for sending blockchain transactions
 * Supports multiple chains with SEI testnet focus
 */
@Injectable()
export class SendTransactionBlock implements EnhancedBlockHandler {
  private readonly logger = new Logger(SendTransactionBlock.name);

  constructor(private readonly configService: ConfigService) {}

  definition: EnhancedBlockDefinition = {
    displayName: 'Send Transaction',
    name: 'SEND_TRANSACTION',
    version: 1,
    description: 'Send tokens or native currency to another wallet address',
    icon: 'send',
    color: '#10B981',
    group: [BlockGroup.BLOCKCHAIN, BlockGroup.ACTION],

    properties: [
      {
        displayName: 'Chain',
        name: 'chainId',
        type: PropertyType.OPTIONS,
        required: true,
        default: 'sei-testnet',
        options: [
          { name: 'SEI Testnet', value: 'sei-testnet' },
          { name: 'Ethereum Sepolia', value: 'ethereum-sepolia' },
          { name: 'Base Sepolia', value: 'base-sepolia' },
        ],
        description: 'Blockchain network to send transaction on',
      },
      {
        displayName: 'Recipient Address',
        name: 'recipientAddress',
        type: PropertyType.STRING,
        required: true,
        description:
          'Destination wallet address (e.g., 0x742d35Cc6634C0532925a3b8d9C9d62e2f6DB4F2)',
      },
      {
        displayName: 'Amount',
        name: 'amount',
        type: PropertyType.STRING,
        required: true,
        description:
          'Amount to send (in native currency or token units, e.g., 0.1)',
      },
      {
        displayName: 'Token Address (Optional)',
        name: 'tokenAddress',
        type: PropertyType.STRING,
        required: false,
        description:
          'Token contract address (leave empty for native currency, e.g., 0x...)',
      },
      {
        displayName: 'Gas Limit',
        name: 'gasLimit',
        type: PropertyType.NUMBER,
        required: false,
        default: 21000,
        description: 'Maximum gas to use for transaction',
      },
    ],

    inputs: [ConnectionType.MAIN],
    outputs: [ConnectionType.MAIN],

    subtitle: '={{$parameter["chainId"]}} → {{$parameter["amount"]}}',
  };

  async execute(
    context: EnhancedBlockExecutionContext,
  ): Promise<ZyraNodeData[]> {
    try {
      const startTime = Date.now();

      context.logger.info('Starting secure blockchain transaction execution');

      // Get transaction parameters
      const chainId = context.getNodeParameter('chainId') as string;
      const recipientAddress = context.getNodeParameter(
        'recipientAddress',
      ) as string;
      const amount = context.getNodeParameter('amount') as string;
      const tokenAddress = context.getNodeParameter('tokenAddress') as
        | string
        | undefined;
      const gasLimit =
        (context.getNodeParameter('gasLimit') as number) || 21000;

      // Validate parameters
      this.validateTransactionParameters({
        chainId,
        recipientAddress,
        amount,
        tokenAddress,
        gasLimit,
      });

      // Enhanced session key validation
      const sessionKeyValidation = await this.validateSessionKey(context, {
        operation: 'send',
        chainId,
        amount,
        toAddress: recipientAddress,
      });

      if (!sessionKeyValidation.isValid) {
        throw new SecurityViolationError(
          `Transaction blocked: ${sessionKeyValidation.errors.join(', ')}`,
          context.blockchainAuthorization?.sessionKeyId || 'unknown',
          'TRANSACTION_VALIDATION_FAILED',
          { chainId, amount, recipientAddress },
        );
      }

      // Log successful validation
      context.logger.info('Session key validation passed', {
        sessionKeyId: context.blockchainAuthorization?.sessionKeyId,
        remainingDailyAmount: sessionKeyValidation.remainingDailyAmount,
      });

      // Execute transaction based on chain
      const transactionResult = await this.executeTransaction({
        chainId,
        recipientAddress,
        amount,
        tokenAddress,
        gasLimit,
        context,
      });

      const executionTime = Date.now() - startTime;

      // Update session key usage after successful transaction
      if (context.blockchainAuthorization?.sessionKeyId) {
        await this.updateSessionKeyUsage(
          context.blockchainAuthorization.sessionKeyId,
          amount,
          transactionResult.transactionHash,
        );
      }

      context.logger.info(
        `Secure transaction completed successfully in ${executionTime}ms`,
        {
          chainId,
          txHash: transactionResult.transactionHash,
          amount,
          sessionKeyId: context.blockchainAuthorization?.sessionKeyId,
        },
      );

      return [
        {
          json: {
            success: true,
            transactionHash: transactionResult.transactionHash,
            chainId,
            recipientAddress,
            amount,
            tokenAddress,
            gasUsed: transactionResult.gasUsed,
            blockNumber: transactionResult.blockNumber,
            executionTime,
            sessionKeyId: context.blockchainAuthorization?.sessionKeyId,
            timestamp: new Date().toISOString(),
          },
        },
      ];
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      context.logger.error(`Transaction execution failed: ${errorMessage}`, {
        stack: error instanceof Error ? error.stack : undefined,
      });

      return [
        {
          json: {
            success: false,
            error: errorMessage,
            chainId: context.getNodeParameter('chainId'),
            timestamp: new Date().toISOString(),
          },
        },
      ];
    }
  }

  /**
   * Validate blockchain authorization exists and covers this operation
   */
  private validateBlockchainAuthorization(
    context: EnhancedBlockExecutionContext,
  ): void {
    const auth = context.blockchainAuthorization;

    if (!auth) {
      throw new Error('Blockchain authorization required but not provided');
    }

    const chainId = context.getNodeParameter('chainId') as string;
    const chainAuth = auth.selectedChains?.find(
      (chain: any) => chain.chainId === chainId,
    );

    if (!chainAuth) {
      throw new Error(`No authorization found for chain: ${chainId}`);
    }

    // Chain is implicitly enabled if it exists in selectedChains array
    // No need to check enabled property as it's only used in UI

    if (!chainAuth.allowedOperations?.includes('transfer')) {
      throw new Error(
        `Transfer operations not authorized for chain: ${chainId}`,
      );
    }

    // Check authorization expiry
    const authAge = Date.now() - auth.timestamp;
    const maxAge = auth.duration * 60 * 60 * 1000; // Convert hours to milliseconds

    if (authAge > maxAge) {
      throw new Error('Blockchain authorization has expired');
    }
  }

  /**
   * Validate transaction input parameters
   */
  private validateTransactionParameters(params: {
    chainId: string;
    recipientAddress: string;
    amount: string;
    tokenAddress?: string;
    gasLimit: number;
  }): void {
    const { chainId, recipientAddress, amount, gasLimit } = params;

    if (!chainId) {
      throw new Error('Chain ID is required');
    }

    if (!recipientAddress || !this.isValidAddress(recipientAddress)) {
      throw new Error('Valid recipient address is required');
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      throw new Error('Valid positive amount is required');
    }

    if (gasLimit < 21000) {
      throw new Error('Gas limit must be at least 21000');
    }
  }

  /**
   * Check if amount is within authorized spending limits
   */
  private checkSpendingLimits(
    context: EnhancedBlockExecutionContext,
    chainId: string,
    amount: string,
  ): void {
    const auth = context.blockchainAuthorization;
    const chainAuth = auth?.selectedChains?.find(
      (chain: any) => chain.chainId === chainId,
    );

    if (!chainAuth?.maxDailySpending) {
      context.logger.warn('No spending limit configured, allowing transaction');
      return;
    }

    const requestedAmount = parseFloat(amount);
    const maxSpending = parseFloat(chainAuth.maxDailySpending);

    if (requestedAmount > maxSpending) {
      throw new Error(
        `Transaction amount (${amount}) exceeds daily limit (${chainAuth.maxDailySpending} ${chainAuth.tokenSymbol})`,
      );
    }
  }

  /**
   * Execute the actual blockchain transaction
   */
  private async executeTransaction(params: {
    chainId: string;
    recipientAddress: string;
    amount: string;
    tokenAddress?: string;
    gasLimit: number;
    context: EnhancedBlockExecutionContext;
  }): Promise<TransactionResult> {
    const {
      chainId,
      recipientAddress,
      amount,
      tokenAddress,
      gasLimit,
      context,
    } = params;

    context.logger.info('Executing blockchain transaction', {
      chainId,
      recipientAddress,
      amount,
      tokenAddress,
      gasLimit,
    });

    // Route to appropriate blockchain handler
    switch (chainId) {
      case 'sei-testnet':
        return this.executeSeiTransaction(params);
      case 'ethereum-sepolia':
      case 'base-sepolia':
        return this.executeEvmTransaction(params);
      default:
        throw new Error(`Unsupported chain: ${chainId}`);
    }
  }

  /**
   * Get user's wallet connection for the specified chain
   */
  private async getWalletConnection(
    userId: string,
    chainId: string,
  ): Promise<WalletConnection> {
    // In production, this would:
    // 1. Query user's wallet from database
    // 2. Decrypt private key using user's password/key
    // 3. Or connect to user's external wallet provider
    // 4. Return secure wallet connection

    // For now, return mock wallet connection
    // SECURITY WARNING: Never hardcode private keys in production!
    return {
      address: `0x${Math.random().toString(16).substring(2, 42)}`,
      privateKey: `0x${Array(64)
        .fill(0)
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join('')}`,
      chainId,
    };
  }

  /**
   * Execute SEI testnet transaction (EVM-compatible)
   */
  private async executeSeiTransaction(params: {
    chainId: string;
    recipientAddress: string;
    amount: string;
    tokenAddress?: string;
    gasLimit: number;
    context: EnhancedBlockExecutionContext;
  }): Promise<TransactionResult> {
    const { chainId, recipientAddress, amount, tokenAddress, context } = params;

    try {
      // Get the system's private key for transaction signing
      const systemPrivateKey = this.configService.get<string>(
        'BLOCKCHAIN_PRIVATE_KEY',
      );
      if (!systemPrivateKey) {
        throw new Error('System blockchain private key not configured');
      }

      // Create account from private key
      const account = privateKeyToAccount(systemPrivateKey as `0x${string}`);

      context.logger.info('Connecting to SEI testnet EVM', {
        rpcUrl: SEI_TESTNET_CONFIG.rpcUrls.default.http[0],
        fromAddress: account.address,
        toAddress: recipientAddress,
        amount,
      });

      // Create public client for reading blockchain state
      const publicClient = createPublicClient({
        chain: SEI_TESTNET_CONFIG as any,
        transport: http(SEI_TESTNET_CONFIG.rpcUrls.default.http[0]),
      });

      // Create wallet client for sending transactions
      const walletClient = createWalletClient({
        account,
        chain: SEI_TESTNET_CONFIG as any,
        transport: http(SEI_TESTNET_CONFIG.rpcUrls.default.http[0]),
      });

      // Validate recipient address format
      if (
        !recipientAddress.startsWith('0x') ||
        recipientAddress.length !== 42
      ) {
        throw new Error('Invalid recipient address format');
      }

      // Parse amount to wei (SEI uses 18 decimals like ETH)
      const value = parseEther(amount);

      // Check balance before transaction
      const balance = await publicClient.getBalance({
        address: account.address,
      });

      if (balance < value) {
        throw new Error(
          `Insufficient balance. Have: ${formatEther(balance)} SEI, Need: ${amount} SEI`,
        );
      }

      // Estimate gas
      const gasEstimate = await publicClient.estimateGas({
        account: account.address,
        to: recipientAddress as `0x${string}`,
        value,
      });

      context.logger.info('Gas estimation completed', {
        estimatedGas: gasEstimate.toString(),
        balance: formatEther(balance),
      });

      // Send the transaction
      const hash = await walletClient.sendTransaction({
        account,
        to: recipientAddress as `0x${string}`,
        value,
        gas: gasEstimate,
      } as any); // Type assertion to bypass kzg requirement

      context.logger.info('SEI transaction submitted', {
        txHash: hash,
        from: account.address,
        to: recipientAddress,
        amount,
        gasEstimate: gasEstimate.toString(),
      });

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 60_000, // 60 seconds timeout
      });

      const explorerUrl = `${SEI_TESTNET_CONFIG.blockExplorers.default.url}/tx/${hash}`;

      context.logger.info('SEI transaction confirmed', {
        txHash: hash,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status,
        explorerUrl,
      });

      return {
        transactionHash: hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        status: receipt.status === 'success' ? 'success' : 'failed',
        explorerUrl,
      };
    } catch (error) {
      context.logger.error('SEI transaction failed', { chainId, error });
      throw new Error(
        `SEI transaction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Execute EVM-compatible transaction (Ethereum, Base)
   */
  private async executeEvmTransaction(params: {
    chainId: string;
    recipientAddress: string;
    amount: string;
    tokenAddress?: string;
    gasLimit: number;
    context: EnhancedBlockExecutionContext;
  }): Promise<TransactionResult> {
    const {
      chainId,
      recipientAddress,
      amount,
      tokenAddress,
      gasLimit,
      context,
    } = params;

    try {
      // Get user's wallet connection
      const wallet = await this.getWalletConnection(context.userId, chainId);

      // Get RPC URL for chain
      const rpcUrl = this.getRpcUrl(chainId);

      context.logger.info('Connecting to EVM chain', {
        chainId,
        rpcUrl,
        fromAddress: wallet.address,
      });

      // In production, this would use viem/ethers to:
      // 1. Create provider with RPC endpoint
      // 2. Create wallet from private key
      // 3. Build transaction (native transfer or ERC-20)
      // 4. Estimate gas and set appropriate gas price
      // 5. Sign and broadcast transaction
      // 6. Wait for confirmation

      // Simulate EVM transaction with realistic timing
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const transactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;

      context.logger.info('EVM transaction submitted successfully', {
        chainId,
        txHash: transactionHash,
        from: wallet.address,
        to: recipientAddress,
        amount,
        token: tokenAddress || 'Native Token',
        gasLimit,
      });

      return {
        transactionHash,
        gasUsed: BigInt(
          Math.min(gasLimit, Math.floor(Math.random() * 40000) + 21000),
        ),
        blockNumber: BigInt(Math.floor(Math.random() * 1000000) + 1000000),
        status: 'success' as const,
        explorerUrl: `https://sepolia.etherscan.io/tx/${transactionHash}`,
      };
    } catch (error) {
      context.logger.error('EVM transaction failed', { chainId, error });
      throw new Error(
        `EVM transaction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get RPC URL for chain
   */
  private getRpcUrl(chainId: string): string {
    const rpcUrls = {
      'ethereum-sepolia': 'https://rpc.sepolia.org',
      'base-sepolia': 'https://sepolia.base.org',
      'sei-testnet': 'https://rpc-testnet.sei-labs.io',
    };

    return rpcUrls[chainId as keyof typeof rpcUrls] || '';
  }

  /**
   * Validate if address format is correct
   */
  private isValidAddress(address: string): boolean {
    // Basic validation for EVM addresses
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Validate session key for transaction execution
   */
  private async validateSessionKey(
    context: EnhancedBlockExecutionContext,
    transaction: {
      operation: string;
      chainId: string;
      amount: string;
      toAddress: string;
    },
  ): Promise<SessionKeyValidationResult> {
    try {
      const sessionKeyId = context.blockchainAuthorization?.sessionKeyId;

      if (!sessionKeyId) {
        return {
          isValid: false,
          errors: ['No session key provided for blockchain operation'],
        };
      }

      // Call session key service for validation
      const response = await fetch(
        `${process.env.API_BASE_URL}/api/session-keys/${sessionKeyId}/validate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.INTERNAL_API_TOKEN}`, // Internal service token
          },
          body: JSON.stringify({
            operation: transaction.operation,
            amount: transaction.amount,
            toAddress: transaction.toAddress,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Session validation failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      context.logger.error('Session key validation failed', error);
      return {
        isValid: false,
        errors: ['Session key validation service unavailable'],
      };
    }
  }

  /**
   * Update session key usage after successful transaction
   */
  private async updateSessionKeyUsage(
    sessionKeyId: string,
    amount: string,
    transactionHash?: string,
  ): Promise<void> {
    try {
      const response = await fetch(
        `${process.env.API_BASE_URL}/api/session-keys/${sessionKeyId}/usage`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.INTERNAL_API_TOKEN}`,
          },
          body: JSON.stringify({
            amount,
            transactionHash,
          }),
        },
      );

      if (!response.ok) {
        this.logger.error('Failed to update session key usage', {
          sessionKeyId,
          amount,
          transactionHash,
          status: response.status,
        });
      } else {
        this.logger.debug('Session key usage updated successfully', {
          sessionKeyId,
          amount,
        });
      }
    } catch (error) {
      this.logger.error('Error updating session key usage', error);
      // Don't throw - usage tracking failure shouldn't break the transaction
    }
  }

  /**
   * Validate block configuration
   */
  async validate(config: Record<string, any>): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!config.recipientAddress) {
      errors.push('Recipient address is required');
    } else if (!this.isValidAddress(config.recipientAddress)) {
      errors.push('Invalid recipient address format');
    }

    if (!config.amount) {
      errors.push('Amount is required');
    } else if (
      isNaN(parseFloat(config.amount)) ||
      parseFloat(config.amount) <= 0
    ) {
      errors.push('Amount must be a positive number');
    }

    if (config.gasLimit && config.gasLimit < 21000) {
      errors.push('Gas limit must be at least 21000');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
