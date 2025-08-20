import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BlockGroup,
  ConnectionType,
  EnhancedBlockDefinition,
  EnhancedBlockExecutionContext,
  EnhancedBlockHandler,
  PropertyType,
  SecurityViolationError,
  SessionKeyValidationResult,
  ValidationResult,
  ZyraNodeData,
} from '@zzyra/types';
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  parseEther,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  TransactionResult as BlockchainTransactionResult,
  TransactionRequest,
} from '../../../../services/blockchain/types/blockchain.types';
import { DatabaseService } from '../../../../services/database.service';
import { ZeroDevService } from '../../../../services/zerodev.service';

/**
 * SEI Network Configuration
 */
const SEI_TESTNET_CONFIG = {
  id: 1328,
  name: 'SEI Testnet',
  network: '1328',
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
 * Session key wallet interface for secure transaction signing
 */
interface SessionKeyWallet {
  address: string;
  privateKey: string;
  smartWalletAddress: string; // The actual smart wallet address that owns this session key
  ownerPrivateKey?: string; // EOA private key for smart wallet ownership
  chainId: string;
  sessionKeyId: string;
  permissions: any[];
  validUntil: string;
  delegationSignature: string;
  // Provider-specific metadata for routing
  providerType?: string; // 'dynamic_zerodev' | 'pimlico_simple_account'
  smartAccountMetadata?: any;
  smartAccountFactory?: string;
  entryPoint?: string;
}

/**
 * Transaction result interface
 */
interface TransactionResult {
  transactionHash: string;
  blockNumber?: number;
  gasUsed?: number;
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

  constructor(
    private readonly configService: ConfigService,
    private readonly zeroDevService: ZeroDevService,
    // private readonly pimlicoService: PimlicoService,
    private readonly databaseService: DatabaseService,
  ) {}

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
        default: '1328',
        options: [
          { name: 'SEI Testnet', value: '1328' },
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

      // Parse blockchain authorization to determine execution method
      const authMethod = await this.parseBlockchainAuthorization(context);

      // Validate authorization based on method (AA or Session Key)
      if (authMethod.useAA && authMethod.aaData) {
        // Validate AA data
        await this.validateAAAuthorization(authMethod.aaData, {
          chainId,
          amount,
          recipientAddress,
        });
        context.logger.info('AA authorization validation passed', {
          smartWalletAddress: authMethod.aaData.smartWalletAddress,
        });
      } else {
        // Enhanced session key validation
        // Determine operation type based on transaction
        const operation = tokenAddress ? 'erc20_transfer' : 'eth_transfer';

        const sessionKeyValidation = await this.validateSessionKey(context, {
          operation,
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
      }

      // Execute transaction based on authorization method
      const transactionResult = await this.executeTransactionWithAuth({
        chainId,
        recipientAddress,
        amount,
        tokenAddress,
        gasLimit,
        context,
        authMethod,
      });

      const executionTime = Date.now() - startTime;

      // Update session key usage after successful transaction (only for session key path)
      if (!authMethod.useAA && context.blockchainAuthorization?.sessionKeyId) {
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
          txHash: transactionResult.transactionHash || '',
          amount,
          sessionKeyId: context.blockchainAuthorization?.sessionKeyId,
        },
      );

      // Check if transaction actually succeeded
      const isSuccess =
        transactionResult.status === 'success' &&
        !!transactionResult.transactionHash;

      return [
        {
          json: {
            success: isSuccess,
            transactionHash: transactionResult.transactionHash || '',
            chainId,
            recipientAddress,
            amount,
            tokenAddress,
            // Convert BigInt values to numbers to prevent serialization errors
            gasUsed:
              typeof transactionResult.gasUsed === 'bigint'
                ? Number(transactionResult.gasUsed)
                : transactionResult.gasUsed || 0,
            blockNumber:
              typeof transactionResult.blockNumber === 'bigint'
                ? Number(transactionResult.blockNumber)
                : transactionResult.blockNumber || 0,
            executionTime,
            sessionKeyId: context.blockchainAuthorization?.sessionKeyId,
            timestamp: new Date().toISOString(),
            error: !isSuccess
              ? 'Transaction failed or returned empty hash'
              : undefined,
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
   * Deploy smart wallet if needed using the EOA owner
   * NOTE: Frontend now handles deployment automatically during session key creation
   */
  private async deploySmartWalletIfNeeded(
    eoaAddress: string,
    smartWalletAddress: string,
    chainId: number,
    context: EnhancedBlockExecutionContext,
  ): Promise<void> {
    context.logger.log(
      `Smart wallet ${smartWalletAddress} is not deployed. Frontend should handle deployment automatically.`,
    );

    // Check if this is a recent session key (user might still be in deployment process)
    let guidanceMessage = `The smart wallet deployment should happen automatically in the frontend. Please try creating a new blockchain authorization.`;

    try {
      const rawSessionKeys =
        await this.databaseService.prisma.sessionKey.findMany({
          where: {
            userId: context.userId,
            status: 'active',
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        });

      // Convert BigInt fields to prevent serialization errors
      const sessionKeys = rawSessionKeys.map((sk) =>
        this.convertBigIntFields(sk),
      );

      const recentSessionKey = sessionKeys.find(
        (sk) =>
          new Date().getTime() - new Date(sk.createdAt).getTime() <
          5 * 60 * 1000, // Created within 5 minutes
      );

      const isRecentDelegation = !!recentSessionKey;
      guidanceMessage = isRecentDelegation
        ? `It looks like you just created this delegation. The smart wallet deployment might still be in progress. Please wait 1-2 minutes and try running the workflow again.`
        : `Please use the Zzyra frontend to create a new blockchain authorization. The frontend will automatically deploy the smart wallet during the process.`;

      context.logger.log('Smart wallet deployment guidance:', {
        hasRecentSession: isRecentDelegation,
        recentSessionKeyId: recentSessionKey?.id,
        smartWalletAddress,
        eoaAddress,
        note: 'Frontend now handles deployment automatically',
      });
    } catch (dbError) {
      context.logger.error('Failed to check recent session keys:', dbError);
      // Keep the default guidance message
    }

    throw new Error(
      `⚠️ Smart Wallet Not Deployed\n\n` +
        `Smart wallet: ${smartWalletAddress}\n` +
        `Owner EOA: ${eoaAddress}\n\n` +
        `${guidanceMessage}\n\n` +
        `Note: Smart wallet deployment is now handled automatically by the frontend during session key creation.`,
    );
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
   * Execute the actual blockchain transaction using ZeroDev
   */
  private async executeTransactionWithAuth(params: {
    chainId: string;
    recipientAddress: string;
    amount: string;
    tokenAddress?: string;
    gasLimit: number;
    context: EnhancedBlockExecutionContext;
    authMethod: {
      useAA: boolean;
      aaData?: any;
      sessionKeyId?: string;
      delegationMode: 'immediate' | 'delegated' | 'hybrid';
    };
  }): Promise<TransactionResult> {
    const { context, authMethod } = params;

    context.logger.info(
      'Executing transaction with hybrid AA services + Zzyra session key',
      {
        chainId: params.chainId,
        recipientAddress: params.recipientAddress,
        amount: params.amount,
        sessionKeyId: params.context.blockchainAuthorization?.sessionKeyId,
      },
    );

    // Execute via hybrid AA services (ZeroDev for most chains, Pimlico for SEI Testnet)
    return this.executeHybridAATransaction(params);
  }

  /**
   * Execute transaction using hybrid AA services with integrated Zzyra session system
   */
  private async executeHybridAATransaction(params: {
    chainId: string;
    recipientAddress: string;
    amount: string;
    tokenAddress?: string;
    gasLimit: number;
    context: EnhancedBlockExecutionContext;
  }): Promise<TransactionResult> {
    try {
      const { context } = params;

      // Get session key data from Zzyra database
      const sessionKeyId = context.blockchainAuthorization?.sessionKeyId;
      if (!sessionKeyId) {
        throw new Error(
          'No session key ID provided in blockchain authorization',
        );
      }

      context.logger.info('Retrieving session key from Zzyra database', {
        sessionKeyId,
        chainId: params.chainId,
      });

      // Get session key data from database
      const rawSessionKeyData =
        await this.databaseService.prisma.sessionKey.findUnique({
          where: { id: sessionKeyId },
          include: { permissions: true },
        });

      if (!rawSessionKeyData) {
        throw new Error(`Session key not found: ${sessionKeyId}`);
      }

      // Convert BigInt fields to avoid serialization issues
      const sessionKeyData = this.convertBigIntFields(rawSessionKeyData);

      // Decrypt session key using parent delegation signature
      const userSignature = sessionKeyData.parentDelegationSignature;
      if (!userSignature) {
        throw new Error(
          'No parent delegation signature available for session key decryption',
        );
      }

      // Decrypt the session key private key
      const decryptedSessionPrivateKey = await this.decryptSessionKey(
        sessionKeyData.encryptedPrivateKey,
        userSignature,
      );

      // Convert chainId to number
      const chainIdNumber = this.getChainIdNumber(params.chainId);

      context.logger.info(
        'Executing transaction with hybrid AA services + Zzyra session key',
        {
          sessionKeyId: sessionKeyData.id,
          smartWalletAddress: sessionKeyData.smartWalletOwner,
          chainId: params.chainId,
        },
      );

      // Build transaction request
      const transaction: TransactionRequest = {
        to: params.recipientAddress,
        value: params.amount,
        data: params.tokenAddress
          ? this.encodeERC20Transfer(
              params.recipientAddress,
              params.amount,
              params.tokenAddress,
            )
          : undefined,
        chainId: chainIdNumber,
        gasLimit: params.gasLimit,
      };

      // Execute via appropriate service based on chainId
      let result: BlockchainTransactionResult;

      // if (chainIdNumber === 1328) {
      //   // Use Pimlico for SEI Testnet (EntryPoint v0.6 compatibility)
      //   context.logger.info(
      //     'Using Pimlico service for SEI Testnet (chainId: 1328)',
      //   );
      //   result = await this.pimlicoService.executeWithZyraSessionKey(
      //     sessionKeyData,
      //     decryptedSessionPrivateKey,
      //     decryptedSessionPrivateKey, // Use same key as owner for simplicity
      //     transaction,
      //   );
      // } else {
      // Use ZeroDev for all other chains (Base, Sepolia, etc.)
      context.logger.info(
        `Using ZeroDev service for chainId: ${chainIdNumber}`,
      );
      result = await this.zeroDevService.executeWithZyraSessionKey(
        sessionKeyData,
        decryptedSessionPrivateKey,
        decryptedSessionPrivateKey, // Use same key as owner for simplicity
        transaction,
      );
      // }

      // Update Zzyra's session key usage tracking
      await this.updateSessionKeyUsage(
        sessionKeyId,
        params.amount,
        result.hash,
      );

      context.logger.info(
        'Hybrid AA service transaction completed successfully',
        {
          transactionHash: result.hash,
          sessionKeyId: sessionKeyData.id,
          blockNumber: result.blockNumber,
          gasUsed: result.gasUsed,
          chainId: chainIdNumber,
        },
      );

      return {
        transactionHash: result.hash,
        blockNumber: result.blockNumber,
        gasUsed: parseInt(result.gasUsed || '0'),
        status: result.status,
        explorerUrl: result.explorerUrl,
      };
    } catch (error) {
      params.context.logger.error('Hybrid AA service transaction failed', {
        error: error instanceof Error ? error.message : String(error),
        chainId: params.chainId,
        sessionKeyId: params.context.blockchainAuthorization?.sessionKeyId,
      });

      return {
        transactionHash: '',
        status: 'failed' as const,
      };
    }
  }

  /**
   * Legacy method removed - using simplified ZeroDev approach
   */

  /**
   * Parse blockchain authorization to determine execution method
   * Supports the new delegation hierarchy: EOA → Smart Wallet → Session Key
   */
  private async parseBlockchainAuthorization(
    context: EnhancedBlockExecutionContext,
  ): Promise<{
    useAA: boolean;
    aaData?: any;
    sessionKeyId?: string;
    delegationMode: 'immediate' | 'delegated' | 'hybrid';
  }> {
    const authConfig = context.blockchainAuthorization;
    if (!authConfig?.delegationSignature) {
      throw new Error('No blockchain authorization provided');
    }

    try {
      // Try to parse delegation signature as JSON from Dynamic Labs AA integration
      const parsedData = JSON.parse(authConfig.delegationSignature);

      // Check if this contains proper Dynamic Labs AA delegation data
      if (parsedData.owner && parsedData.smartWallet && parsedData.operations) {
        context.logger.info('Detected Dynamic Labs AA delegation format', {
          owner: parsedData.owner,
          smartWallet: parsedData.smartWallet,
          operations: parsedData.operations,
        });

        return {
          useAA: true,
          delegationMode: 'immediate', // EOA directly controls smart wallet
          aaData: {
            smartWalletAddress: parsedData.smartWallet,
            ownerAddress: parsedData.owner,
            signature: authConfig.delegationSignature,
            expiresAt: parsedData.validUntil,
            operations: parsedData.operations,
            maxAmountPerTx: parsedData.maxAmountPerTx,
            maxDailyAmount: parsedData.maxDailyAmount,
            // Note: smartAccountClient will be created on-demand using Pimlico service
          },
        };
      }

      // Fallback: Check for legacy useAA format or session key delegation
      if (parsedData.useAA === true) {
        // If this has a sessionKeyId, we need to fetch session key data to get smart wallet address
        if (parsedData.sessionKeyId) {
          context.logger.info(
            'Detected session key delegation with useAA=true',
            {
              sessionKeyId: parsedData.sessionKeyId,
              operations: parsedData.operations,
            },
          );

          return {
            useAA: true,
            delegationMode: 'delegated', // Session key delegation
            sessionKeyId: parsedData.sessionKeyId,
            // aaData will be populated later in executeTransactionWithAuth
          };
        }

        // Legacy AA format without session key
        return {
          useAA: true,
          delegationMode: 'hybrid',
          aaData: parsedData,
        };
      }
    } catch (error) {
      context.logger.debug(
        'Delegation signature is not JSON, checking for session key',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }

    // Fallback to session key
    if (authConfig.sessionKeyId) {
      return {
        useAA: false,
        delegationMode: 'immediate',
        sessionKeyId: authConfig.sessionKeyId,
      };
    }

    throw new Error(
      'Invalid blockchain authorization format. Expected either Dynamic Labs AA delegation or session key.',
    );
  }

  /**
   * Validate Account Abstraction authorization data
   */
  private async validateAAAuthorization(
    aaData: any,
    transaction: {
      chainId: string;
      amount: string;
      recipientAddress: string;
    },
  ): Promise<void> {
    // Debug: Log AA data at validation point
    this.logger.log('Validating AA authorization', {
      hasAAData: !!aaData,
      smartWalletAddress: aaData?.smartWalletAddress,
      ownerAddress: aaData?.ownerAddress,
      sessionKeyId: aaData?.sessionKeyId,
      hasSignature: !!aaData?.signature,
      expiresAt: aaData?.expiresAt,
    });

    // Basic AA data validation
    if (!aaData.smartWalletAddress) {
      this.logger.error('AA validation failed: missing smartWalletAddress', {
        aaData,
      });
      throw new Error('Smart wallet address is required for AA transactions');
    }

    if (!aaData.signature) {
      throw new Error('Delegation signature is required for AA transactions');
    }

    if (!aaData.expiresAt) {
      throw new Error('Expiration time is required for AA delegation');
    }

    // Check if delegation has expired
    const expiryTime = new Date(aaData.expiresAt).getTime();
    const currentTime = Date.now();

    if (currentTime > expiryTime) {
      throw new Error('AA delegation has expired');
    }

    // Validate smart wallet address format
    if (!this.isValidAddress(aaData.smartWalletAddress)) {
      throw new Error('Invalid smart wallet address format');
    }

    // Additional validations could include:
    // - Check if smart wallet is deployed
    // - Verify delegation signature
    // - Check spending limits
    // - Validate against whitelist/blacklist
  }

  /**
   * Utility to safely stringify objects with BigInt values
   */
  private safeStringify(obj: any): any {
    return JSON.parse(
      JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }

  /**
   * Convert BigInt fields in database results to strings
   */
  private convertBigIntFields(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    const converted = { ...obj };

    // Common BigInt fields in SessionKey model
    if (converted.nonce && typeof converted.nonce === 'bigint') {
      converted.nonce = converted.nonce.toString();
    }
    if (
      converted.totalUsedAmount &&
      typeof converted.totalUsedAmount === 'bigint'
    ) {
      converted.totalUsedAmount = converted.totalUsedAmount.toString();
    }
    if (
      converted.dailyUsedAmount &&
      typeof converted.dailyUsedAmount === 'bigint'
    ) {
      converted.dailyUsedAmount = converted.dailyUsedAmount.toString();
    }

    return converted;
  }

  /**
   * Convert chainId string to number (simplified for ZeroDev)
   */
  private getChainIdNumber(chainId: string): number {
    if (chainId === '1328') return 1328; // SEI Testnet
    if (chainId === 'base-sepolia' || chainId === '84532') return 84532;
    if (chainId === 'ethereum-sepolia' || chainId === '11155111')
      return 11155111;
    if (chainId === '8453') return 8453; // Base

    // Try to parse as number
    const parsed = parseInt(chainId);
    if (!isNaN(parsed)) return parsed;

    // Default fallback
    return 1328;
  }

  /**
   * Simplified helper method to get chainId as number
   */

  /**
   * Legacy method (removed - using simplified ZeroDev approach)
   */

  /**
   * Encode ERC20 transfer data
   */
  private encodeERC20Transfer(
    to: string,
    amount: string,
    _tokenAddress: string,
  ): string {
    const functionSignature = '0xa9059cbb';
    const toAddress = to.slice(2).padStart(64, '0');
    const amountHex = parseEther(amount).toString(16).padStart(64, '0');
    return functionSignature + toAddress + amountHex;
  }

  /**
   * Get current nonce for smart wallet from bundler
   */
  private async getSmartWalletNonce(
    smartWalletAddress: string,
    bundlerUrl: string,
    context: EnhancedBlockExecutionContext,
  ): Promise<string> {
    try {
      const response = await fetch(bundlerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getUserOperationCount',
          params: [smartWalletAddress, 'latest'],
        }),
      });

      const result = await response.json();
      if (result.result) {
        context.logger.debug('Retrieved smart wallet nonce', {
          smartWallet: smartWalletAddress,
          nonce: result.result,
        });
        return result.result;
      }

      context.logger.warn('Failed to get nonce, using 0x0');
      return '0x0';
    } catch (error) {
      context.logger.warn('Error fetching nonce, using 0x0', { error });
      return '0x0';
    }
  }

  /**
   * Get initCode for smart wallet deployment (if not deployed)
   */
  private async getInitCode(
    smartWalletAddress: string,
    ownerAddress: string,
    chainId: string,
    context: EnhancedBlockExecutionContext,
  ): Promise<string> {
    try {
      const { createPublicClient, http } = require('viem');
      const publicClient = createPublicClient({
        chain: {
          id: chainId === '1328' ? 1328 : 11155111,
          rpcUrls: {
            default: {
              http: [
                chainId === '1328'
                  ? 'https://evm-rpc-testnet.sei-apis.com'
                  : 'https://rpc.sepolia.org',
              ],
            },
          },
        },
        transport: http(),
      });

      const bytecode = await publicClient.getBytecode({
        address: smartWalletAddress,
      });

      if (bytecode && bytecode !== '0x') {
        context.logger.debug('Smart wallet already deployed');
        return '0x';
      }

      // Smart wallet not deployed, need factory deployment data
      context.logger.info(
        'Smart wallet not deployed, including factory initCode',
      );

      // Pimlico factory address and createAccount calldata
      const factoryAddress = '0x5de4839a76cf55d0c90e2061ef4386d962E15ae3';
      const { encodeFunctionData } = require('viem');

      const createAccountData = encodeFunctionData({
        abi: [
          {
            name: 'createAccount',
            type: 'function',
            inputs: [
              { name: 'owner', type: 'address' },
              { name: 'salt', type: 'uint256' },
            ],
          },
        ],
        functionName: 'createAccount',
        args: [ownerAddress, 0n],
      });

      return factoryAddress + createAccountData.slice(2);
    } catch (error) {
      context.logger.warn('Failed to check smart wallet deployment status', {
        error,
      });
      return '0x';
    }
  }

  /**
   * Encode smart wallet call data for transaction execution
   */
  private async encodeSmartWalletCall(
    recipientAddress: string,
    amount: string,
    tokenAddress: string | undefined,
    context: EnhancedBlockExecutionContext,
  ): Promise<string> {
    const { encodeFunctionData, parseEther } = require('viem');

    if (tokenAddress) {
      // ERC20 transfer
      const transferData = encodeFunctionData({
        abi: [
          {
            name: 'transfer',
            type: 'function',
            inputs: [
              { name: 'to', type: 'address' },
              { name: 'value', type: 'uint256' },
            ],
          },
        ],
        functionName: 'transfer',
        args: [recipientAddress, parseEther(amount)],
      });

      // Encode execute call to smart wallet for ERC20 transfer
      return encodeFunctionData({
        abi: [
          {
            name: 'execute',
            type: 'function',
            inputs: [
              { name: 'to', type: 'address' },
              { name: 'value', type: 'uint256' },
              { name: 'data', type: 'bytes' },
            ],
          },
        ],
        functionName: 'execute',
        args: [tokenAddress, 0n, transferData],
      });
    } else {
      // ETH transfer
      return encodeFunctionData({
        abi: [
          {
            name: 'execute',
            type: 'function',
            inputs: [
              { name: 'to', type: 'address' },
              { name: 'value', type: 'uint256' },
              { name: 'data', type: 'bytes' },
            ],
          },
        ],
        functionName: 'execute',
        args: [recipientAddress, parseEther(amount), '0x'],
      });
    }
  }

  /**
   * Estimate gas for UserOperation
   */
  private async estimateUserOperationGas(
    userOperation: {
      sender: string;
      nonce: string;
      initCode: string;
      callData: string;
    },
    bundlerUrl: string,
    context: EnhancedBlockExecutionContext,
  ): Promise<{
    callGasLimit: string;
    verificationGasLimit: string;
    preVerificationGas: string;
  }> {
    // Default gas estimates
    let gasEstimates = {
      callGasLimit: '0x15f90', // 90000
      verificationGasLimit: '0x15f90', // 90000
      preVerificationGas: '0x5208', // 21000
    };

    try {
      const { AA_CONFIG } = require('../../../../config');
      const response = await fetch(bundlerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_estimateUserOperationGas',
          params: [
            {
              ...userOperation,
              signature: '0x' + '0'.repeat(130), // Dummy signature
              paymasterAndData: '0x',
            },
            AA_CONFIG.entryPointAddress,
          ],
        }),
      });

      const result = await response.json();
      if (result.result) {
        gasEstimates = {
          callGasLimit: result.result.callGasLimit || gasEstimates.callGasLimit,
          verificationGasLimit:
            result.result.verificationGasLimit ||
            gasEstimates.verificationGasLimit,
          preVerificationGas:
            result.result.preVerificationGas || gasEstimates.preVerificationGas,
        };
        context.logger.debug('Gas estimation successful', gasEstimates);
      }
    } catch (error) {
      context.logger.warn('Gas estimation failed, using defaults', { error });
    }

    return gasEstimates;
  }

  /**
   * Get current gas prices from network
   */
  private async getCurrentGasPrices(
    chainId: string,
    context: EnhancedBlockExecutionContext,
  ): Promise<{
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
  }> {
    // Default gas prices
    let gasPrices = {
      maxFeePerGas: '0x77359400', // 2 gwei
      maxPriorityFeePerGas: '0x59682f00', // 1.5 gwei
    };

    try {
      const { createPublicClient, http } = require('viem');
      const publicClient = createPublicClient({
        chain: {
          id: chainId === '1328' ? 1328 : 11155111,
          rpcUrls: {
            default: {
              http: [
                chainId === '1328'
                  ? 'https://evm-rpc-testnet.sei-apis.com'
                  : 'https://rpc.sepolia.org',
              ],
            },
          },
        },
        transport: http(),
      });

      const gasPrice = await publicClient.getGasPrice();
      const maxFeePerGas = (gasPrice * 12n) / 10n; // 20% buffer
      const maxPriorityFeePerGas = (gasPrice * 11n) / 10n; // 10% tip

      gasPrices = {
        maxFeePerGas: `0x${maxFeePerGas.toString(16)}`,
        maxPriorityFeePerGas: `0x${maxPriorityFeePerGas.toString(16)}`,
      };

      context.logger.debug('Retrieved current gas prices', gasPrices);
    } catch (error) {
      context.logger.warn('Failed to get gas prices, using defaults', {
        error,
      });
    }

    return gasPrices;
  }

  /**
   * Get paymaster data for gas sponsorship
   */
  private getPaymasterData(paymasterUrl: string): string {
    // For Pimlico, the paymaster data is handled automatically by the middleware
    // This is a simplified version - in production you'd get this from the paymaster service
    return paymasterUrl + '0'.repeat(64);
  }

  /**
   * Sign UserOperation using session key delegation
   */
  private async signUserOperation(
    userOperation: any,
    aaData: any,
    chainId: string,
    context: EnhancedBlockExecutionContext,
  ): Promise<string> {
    try {
      // For session key delegation, we need to reconstruct the session key from the delegation
      // This would typically involve decrypting the session key using the delegation signature

      // For now, this is a placeholder implementation
      // In production, you'd:
      // 1. Decrypt the session private key from the delegation
      // 2. Use that key to sign the UserOperation hash
      // 3. Format the signature according to the smart wallet's signature format

      context.logger.debug('Signing UserOperation with session key', {
        smartWallet: aaData.smartWalletAddress,
        owner: aaData.ownerAddress,
      });

      // Placeholder signature - in production this would be real
      const placeholderSignature = '0x' + '1'.repeat(130);

      context.logger.debug('UserOperation signed', {
        signatureLength: placeholderSignature.length,
      });

      return placeholderSignature;
    } catch (error) {
      context.logger.error('Failed to sign UserOperation', { error });
      throw new Error('UserOperation signing failed');
    }
  }

  /**
   * Submit UserOperation to bundler
   */
  private async submitUserOperation(
    userOperation: any,
    bundlerUrl: string,
    context: EnhancedBlockExecutionContext,
  ): Promise<string> {
    try {
      const { AA_CONFIG } = require('../../../../config');

      // Log the UserOperation being submitted for debugging
      context.logger.info('Submitting UserOperation to bundler', {
        bundlerUrl,
        entryPoint: AA_CONFIG.entryPointAddress,
        userOperation: {
          sender: userOperation.sender,
          nonce: userOperation.nonce,
          callData: userOperation.callData?.substring(0, 100) + '...',
          maxFeePerGas: userOperation.maxFeePerGas,
          maxPriorityFeePerGas: userOperation.maxPriorityFeePerGas,
        },
      });

      const response = await fetch(bundlerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_sendUserOperation',
          params: [userOperation, AA_CONFIG.entryPointAddress],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = `Bundler HTTP error ${response.status}: ${errorText}`;
        context.logger.error('Bundler HTTP error', {
          status: response.status,
          errorText,
          bundlerUrl,
          entryPoint: AA_CONFIG.entryPointAddress,
        });
        throw new Error(error);
      }

      const result = await response.json();
      if (result.error) {
        const error = `Bundler error: ${result.error.message}`;
        context.logger.error('Bundler JSON-RPC error', {
          error: result.error,
          bundlerUrl,
          entryPoint: AA_CONFIG.entryPointAddress,
        });
        throw new Error(error);
      }

      const userOpHash = result.result;
      context.logger.info('UserOperation submitted successfully', {
        userOpHash,
        bundlerUrl,
        entryPoint: AA_CONFIG.entryPointAddress,
      });

      return userOpHash;
    } catch (error) {
      // Log the full error details before re-throwing
      context.logger.error('Failed to submit UserOperation', {
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        bundlerUrl,
        userOperation: {
          sender: userOperation.sender,
          nonce: userOperation.nonce,
          callData: userOperation.callData?.substring(0, 100) + '...',
        },
      });

      // Re-throw with more context
      if (error instanceof Error) {
        throw new Error(`UserOperation submission failed: ${error.message}`);
      } else {
        throw new Error(`UserOperation submission failed: ${String(error)}`);
      }
    }
  }

  /**
   * Wait for UserOperation to be included in a transaction
   */
  private async waitForUserOpTransaction(
    userOpHash: string,
    bundlerUrl: string,
    context: EnhancedBlockExecutionContext,
    timeout: number = 60000,
  ): Promise<{
    transactionHash: string;
    blockNumber: number;
    gasUsed: number;
  }> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(bundlerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_getUserOperationReceipt',
            params: [userOpHash],
          }),
        });

        const result = await response.json();
        if (result.result && result.result.receipt) {
          const receipt = result.result.receipt;
          context.logger.info('UserOperation confirmed', {
            userOpHash,
            transactionHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber,
          });

          return {
            transactionHash: receipt.transactionHash,
            blockNumber: parseInt(receipt.blockNumber, 16),
            gasUsed: parseInt(receipt.gasUsed || '0x0', 16),
          };
        }
      } catch (error) {
        context.logger.warn('Error checking UserOperation receipt', { error });
      }

      // Wait 2 seconds before next check
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error('UserOperation confirmation timeout');
  }

  /**
   * Get session key-based wallet connection for secure transaction signing
   */
  private async getSessionKeyWallet(
    context: EnhancedBlockExecutionContext,
    chainId: string,
  ): Promise<SessionKeyWallet> {
    const sessionKeyId = context.blockchainAuthorization?.sessionKeyId;

    if (!sessionKeyId) {
      throw new Error('No session key provided for transaction signing');
    }

    try {
      // Fetch session key from API with HMAC service auth
      const crypto = require('crypto');
      const getTimestamp = Date.now().toString();
      const getNonce = `${getTimestamp}-${Math.random().toString(36).slice(2)}`;
      const getBody = '';
      const getBodyHash = crypto
        .createHash('sha256')
        .update(getBody)
        .digest('hex');
      const getPath = `/api/session-keys/${sessionKeyId}`;
      const getCanonical = `GET\n${getPath}\n${getBodyHash}\n${getTimestamp}\n${getNonce}`;
      const getSignature = crypto
        .createHmac('sha256', process.env.SERVICE_AUTH_WORKER_SECRET as string)
        .update(getCanonical)
        .digest('base64');

      const response = await fetch(`${process.env.API_BASE_URL}${getPath}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Id': process.env.SERVICE_AUTH_WORKER_ID || '',
          'X-Timestamp': getTimestamp,
          'X-Nonce': getNonce,
          'X-Signature': getSignature,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch session key: ${response.statusText}`);
      }

      const { data: sessionKey } = await response.json();

      // Debug: Log the session key data to verify smartWalletOwner is present
      this.logger.log('Session key data received from API', {
        sessionKeyId: sessionKeyId.substring(0, 8) + '...',
        walletAddress: sessionKey.walletAddress,
        smartWalletOwner: sessionKey.smartWalletOwner,
        chainId: sessionKey.chainId,
        hasPermissions: sessionKey.permissions?.length > 0,
        validUntil: sessionKey.validUntil,
        hasEncryptedKey: !!sessionKey.encryptedPrivateKey,
        hasParentSignature: !!sessionKey.parentDelegationSignature,
        parentSignatureLength:
          sessionKey.parentDelegationSignature?.length || 0,
        parentSignaturePreview:
          sessionKey.parentDelegationSignature?.substring(0, 20) + '...',
        // Provider-specific metadata for routing
        providerType: sessionKey.providerType || 'dynamic_zerodev',
        hasSmartAccountMetadata: !!sessionKey.smartAccountMetadata,
        smartAccountFactory: sessionKey.smartAccountFactory,
        entryPoint: sessionKey.entryPoint,
      });

      // Use the actual user signature from the database for decryption
      // The parentDelegationSignature is the signature that was used to encrypt the session key
      const decryptionMessage = sessionKey.parentDelegationSignature;

      this.logger.debug('Using parent delegation signature for decryption', {
        sessionKeyId: sessionKeyId.substring(0, 8) + '...',
        hasParentSignature: !!decryptionMessage,
        signatureLength: decryptionMessage?.length || 0,
      });

      // Decrypt the session private key using the parent delegation signature
      const privateKey = await this.decryptSessionKey(
        sessionKey.encryptedPrivateKey,
        decryptionMessage,
      );

      return {
        address: sessionKey.walletAddress,
        privateKey: privateKey,
        smartWalletAddress: sessionKey.smartWalletOwner,
        chainId: chainId,
        sessionKeyId: sessionKeyId,
        permissions: sessionKey.permissions,
        validUntil: sessionKey.validUntil,
        delegationSignature: sessionKey.parentDelegationSignature,
        // Provider metadata for routing decisions
        providerType: sessionKey.providerType || 'dynamic_zerodev',
        smartAccountMetadata: sessionKey.smartAccountMetadata,
        smartAccountFactory: sessionKey.smartAccountFactory,
        entryPoint: sessionKey.entryPoint,
      };
    } catch (error) {
      this.logger.error('Failed to get session key wallet', {
        sessionKeyId,
        chainId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(
        `Session key wallet initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Normalize a hex private key to 0x-prefixed 32-byte format
   */
  private formatPrivateKey(privateKey: string): `0x${string}` {
    const hex = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
      throw new Error('Invalid session key format: expected 32-byte hex');
    }
    return `0x${hex}`;
  }

  /**
   * Decrypt session key private key using delegation signature
   * Must match the SessionKeyCryptoService encryption format
   */
  private async decryptSessionKey(
    encryptedPrivateKey: string,
    delegationSignature: string,
  ): Promise<string> {
    try {
      const crypto = require('crypto');
      const { promisify } = require('util');

      this.logger.debug('Starting session key decryption', {
        encryptedKeyLength: encryptedPrivateKey?.length || 0,
        signatureLength: delegationSignature?.length || 0,
        signatureType: typeof delegationSignature,
        signaturePreview: delegationSignature?.substring(0, 20) + '...',
      });

      if (!encryptedPrivateKey || !delegationSignature) {
        throw new Error('Missing encrypted key or delegation signature');
      }

      // Constants matching SessionKeyCryptoService
      const algorithm = 'aes-256-gcm';
      const keyLength = 32;
      const ivLength = 16;
      const tagLength = 16;
      const saltLength = 32;

      // Parse the base64 encoded data (salt + iv + tag + encrypted)
      let combined;
      try {
        combined = Buffer.from(encryptedPrivateKey, 'base64');
        this.logger.debug('Successfully parsed base64 encrypted key', {
          combinedLength: combined.length,
          expectedMinLength: saltLength + ivLength + tagLength + 32, // minimum for encrypted data
        });
      } catch (error) {
        throw new Error(`Invalid base64 encrypted key: ${error.message}`);
      }

      if (combined.length < saltLength + ivLength + tagLength) {
        throw new Error(
          `Encrypted key too short: ${combined.length} bytes, expected at least ${saltLength + ivLength + tagLength}`,
        );
      }

      // Extract components
      const salt = combined.slice(0, saltLength);
      const iv = combined.slice(saltLength, saltLength + ivLength);
      const tag = combined.slice(
        saltLength + ivLength,
        saltLength + ivLength + tagLength,
      );
      const encrypted = combined.slice(saltLength + ivLength + tagLength);

      this.logger.debug('Extracted encryption components', {
        saltLength: salt.length,
        ivLength: iv.length,
        tagLength: tag.length,
        encryptedLength: encrypted.length,
      });

      // Derive key from delegation signature using scrypt (same as encryption)
      const scryptAsync = promisify(crypto.scrypt);
      let key;
      try {
        key = await scryptAsync(delegationSignature, salt, keyLength);
        this.logger.debug('Successfully derived decryption key');
      } catch (error) {
        throw new Error(`Key derivation failed: ${error.message}`);
      }

      // Create decipher
      let decipher;
      try {
        decipher = crypto.createDecipheriv(algorithm, key, iv);
        decipher.setAuthTag(tag);
        this.logger.debug('Successfully created decipher');
      } catch (error) {
        throw new Error(`Decipher creation failed: ${error.message}`);
      }

      // Decrypt the private key
      let decrypted;
      try {
        decrypted = decipher.update(encrypted, null, 'utf8');
        decrypted += decipher.final('utf8');
        this.logger.debug('Session key decrypted successfully', {
          decryptedLength: decrypted?.length || 0,
        });
      } catch (error) {
        throw new Error(`Decryption failed: ${error.message}`);
      }

      return decrypted;
    } catch (error) {
      this.logger.error('Failed to decrypt session key', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error(
        `Session key decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
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
      // Get session key wallet for secure transaction signing
      const sessionWallet = await this.getSessionKeyWallet(context, chainId);

      // Create account from session key private key
      const formattedPk = this.formatPrivateKey(sessionWallet.privateKey);
      const account = privateKeyToAccount(formattedPk);

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
        blockNumber: Number(receipt.blockNumber),
        gasUsed: Number(receipt.gasUsed),
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
      // Get session key wallet for secure transaction signing
      const sessionWallet = await this.getSessionKeyWallet(context, chainId);

      // Get RPC URL for chain
      const rpcUrl = this.getRpcUrl(chainId);

      context.logger.info('Connecting to EVM chain', {
        chainId,
        rpcUrl,
        fromAddress: sessionWallet.address,
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
        from: sessionWallet.address,
        to: recipientAddress,
        amount,
        token: tokenAddress || 'Native Token',
        gasLimit,
      });

      return {
        transactionHash,
        gasUsed: Math.min(gasLimit, Math.floor(Math.random() * 40000) + 21000),
        blockNumber: Math.floor(Math.random() * 1000000) + 1000000,
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
      '1328': 'https://rpc-testnet.sei-labs.io',
    };

    return rpcUrls[chainId as keyof typeof rpcUrls] || '';
  }

  /**
   * Get explorer URL for transaction
   */
  private getExplorerUrl(chainId: string, transactionHash: string): string {
    const explorerUrls = {
      'ethereum-sepolia': 'https://sepolia.etherscan.io',
      'base-sepolia': 'https://sepolia.basescan.org',
      '1328': 'https://seitrace.com',
    };

    const baseUrl =
      explorerUrls[chainId as keyof typeof explorerUrls] ||
      'https://seitrace.com';
    return `${baseUrl}/tx/${transactionHash}`;
  }

  /**
   * Validate if address format is correct
   */
  private isValidAddress(address: string): boolean {
    // Basic validation for EVM addresses
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Convert new TransactionResult format to legacy format for backward compatibility
   */
  private convertToLegacyTransactionResult(
    result: BlockchainTransactionResult,
  ): TransactionResult {
    return {
      transactionHash: result.hash,
      blockNumber: result.blockNumber,
      gasUsed:
        typeof result.gasUsed === 'string'
          ? parseInt(result.gasUsed)
          : result.gasUsed,
      status: result.status,
      explorerUrl: result.explorerUrl,
    };
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

      // Call session key service for validation with HMAC service auth
      const crypto = require('crypto');
      const vTimestamp = Date.now().toString();
      const vNonce = `${vTimestamp}-${Math.random().toString(36).slice(2)}`;
      const vBodyObj = {
        operation: transaction.operation,
        amount: transaction.amount,
        toAddress: transaction.toAddress,
      };
      const vBody = JSON.stringify(vBodyObj);
      const vBodyHash = crypto.createHash('sha256').update(vBody).digest('hex');
      const vPath = `/api/session-keys/${sessionKeyId}/validate`;
      const vCanonical = `POST\n${vPath}\n${vBodyHash}\n${vTimestamp}\n${vNonce}`;
      const vSignature = crypto
        .createHmac(
          'sha256',
          process.env.SERVICE_AUTH_INTERNAL_SECRET as string,
        )
        .update(vCanonical)
        .digest('base64');
      const response = await fetch(`${process.env.API_BASE_URL}${vPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Id': process.env.SERVICE_AUTH_INTERNAL_ID || '',
          'X-Timestamp': vTimestamp,
          'X-Nonce': vNonce,
          'X-Signature': vSignature,
        },
        body: vBody,
      });

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
      const crypto = require('crypto');
      const uTimestamp = Date.now().toString();
      const uNonce = `${uTimestamp}-${Math.random().toString(36).slice(2)}`;
      const uBodyObj = { amount, transactionHash };
      const uBody = JSON.stringify(uBodyObj);
      const uBodyHash = crypto.createHash('sha256').update(uBody).digest('hex');
      const uPath = `/api/session-keys/${sessionKeyId}/usage`;
      const uCanonical = `PUT\n${uPath}\n${uBodyHash}\n${uTimestamp}\n${uNonce}`;
      const uSignature = crypto
        .createHmac(
          'sha256',
          process.env.SERVICE_AUTH_INTERNAL_SECRET as string,
        )
        .update(uCanonical)
        .digest('base64');
      const response = await fetch(`${process.env.API_BASE_URL}${uPath}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Id': process.env.SERVICE_AUTH_INTERNAL_ID || '',
          'X-Timestamp': uTimestamp,
          'X-Nonce': uNonce,
          'X-Signature': uSignature,
        },
        body: uBody,
      });

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
