import { Injectable, Logger } from '@nestjs/common';
import {
  createPublicClient,
  http,
  parseEther,
  Address,
  encodeFunctionData,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia, base, baseSepolia, seiTestnet } from 'viem/chains';
import { IAccountAbstractionService } from './blockchain/base/IBlockchainService';
import {
  TransactionRequest as BlockchainTransactionRequest,
  TransactionResult as BlockchainTransactionResult,
} from './blockchain/types/blockchain.types';

// Permissionless.js imports for v0.2.53
import { createSmartAccountClient } from 'permissionless';
import { toSimpleSmartAccount } from 'permissionless/accounts';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import {
  entryPoint07Address,
  getUserOperationHash,
} from 'viem/account-abstraction';

interface PimlicoPermissionlessConfig {
  ownerPrivateKey: string;
  chainId: number;
  delegationMode?: 'immediate' | 'delegated' | 'hybrid';
}

interface SessionKeyConfig {
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

interface TransactionRequest {
  to: string;
  value: string;
  data?: string;
  chainId: number;
}

@Injectable()
export class PimlicoPermissionlessService
  implements IAccountAbstractionService
{
  private readonly logger = new Logger(PimlicoPermissionlessService.name);
  private readonly pimlicoApiKey: string;
  private readonly supportedChains = [seiTestnet, sepolia, base, baseSepolia];

  constructor() {
    this.pimlicoApiKey = process.env.PIMLICO_API_KEY || '';

    if (!this.pimlicoApiKey) {
      this.logger.warn(
        'PIMLICO_API_KEY not configured - Account Abstraction features will be limited',
      );
    }
  }

  /**
   * Get chain configuration by chain ID
   */
  private getChainConfig(chainId: number) {
    const chain = this.supportedChains.find((c) => c.id === chainId);
    if (!chain) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    return chain;
  }

  /**
   * Create public client for the chain
   */
  private createPublicClient(chainId: number) {
    const chain = this.getChainConfig(chainId);
    return createPublicClient({
      transport: http(chain.rpcUrls.default.http[0]),
      chain,
    });
  }

  /**
   * Create Pimlico client using permissionless.js
   */
  private createPimlicoClient(chainId: number) {
    const chain = this.getChainConfig(chainId);
    const pimlicoUrl = `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${this.pimlicoApiKey}`;

    this.logger.log('Creating Pimlico client with permissionless.js', {
      chainId,
      pimlicoUrl: pimlicoUrl.split('?')[0], // Remove API key from logs
      entryPoint: entryPoint07Address,
    });

    return createPimlicoClient({
      transport: http(pimlicoUrl),
      entryPoint: {
        address: entryPoint07Address,
        version: '0.7',
      },
    });
  }

  /**
   * Create a smart account using permissionless.js SimpleAccount
   */
  async createSmartAccount(config: PimlicoPermissionlessConfig): Promise<{
    smartAccountAddress: string;
    ownerAddress: string;
    chainId: number;
    delegationMode: string;
    deploymentRequired: boolean;
    smartAccountClient?: any;
  }> {
    try {
      const chain = this.getChainConfig(config.chainId);
      const publicClient = this.createPublicClient(config.chainId);
      const pimlicoClient = this.createPimlicoClient(config.chainId);

      // Create owner account from private key
      const owner = privateKeyToAccount(
        config.ownerPrivateKey as `0x${string}`,
      );

      this.logger.log(
        `Creating SimpleAccount with permissionless.js for chain ${config.chainId}`,
        {
          ownerAddress: owner.address,
          delegationMode: config.delegationMode || 'immediate',
          chainId: config.chainId,
        },
      );

      // Create SimpleAccount using permissionless.js
      const simpleAccount = await toSimpleSmartAccount({
        client: publicClient,
        owner: owner,
        entryPoint: {
          address: entryPoint07Address,
          version: '0.7',
        },
      });

      this.logger.log('✅ SimpleAccount created with permissionless.js', {
        smartAccountAddress: simpleAccount.address,
        ownerAddress: owner.address,
        chainId: config.chainId,
        entryPoint: entryPoint07Address,
      });

      // Create smart account client with Pimlico paymaster
      const smartAccountClient = createSmartAccountClient({
        account: simpleAccount,
        chain: chain,
        bundlerTransport: http(
          `https://api.pimlico.io/v2/${config.chainId}/rpc?apikey=${this.pimlicoApiKey}`,
        ),
        paymaster: pimlicoClient,
        userOperation: {
          estimateFeesPerGas: async () => {
            return (await pimlicoClient.getUserOperationGasPrice()).fast;
          },
        },
      });

      // Check if account needs deployment
      const code = await publicClient.getBytecode({
        address: simpleAccount.address,
      });
      const deploymentRequired = !code || code === '0x';

      this.logger.log('Permissionless SimpleAccount setup complete', {
        smartAccountAddress: simpleAccount.address,
        ownerAddress: owner.address,
        deploymentRequired,
        chainId: config.chainId,
        hasPaymaster: true, // Always true with Pimlico
      });

      return {
        smartAccountAddress: simpleAccount.address,
        ownerAddress: owner.address,
        chainId: config.chainId,
        delegationMode: config.delegationMode || 'immediate',
        deploymentRequired,
        smartAccountClient: smartAccountClient,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create permissionless SimpleAccount: ${error}`,
        {
          chainId: config.chainId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );
      throw new Error(
        `Failed to create permissionless SimpleAccount: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Execute a transaction using session key with permissionless.js
   * FIXED: Use existing funded smart account instead of creating new one
   */
  async executeWithSessionKey(
    sessionConfig: SessionKeyConfig,
    transaction: TransactionRequest,
  ): Promise<BlockchainTransactionResult> {
    try {
      this.logger.log(
        `Executing transaction with permissionless.js session key on existing smart account`,
        {
          sessionKeyAddress: privateKeyToAccount(
            sessionConfig.sessionPrivateKey as `0x${string}`,
          ).address,
          existingSmartWalletAddress: sessionConfig.smartWalletAddress, // ✅ Use existing funded smart account
          to: transaction.to,
          value: transaction.value,
          chainId: transaction.chainId,
          delegationType: 'existing_smart_account',
        },
      );

      // Validate permissions
      this.validateTransactionPermissions(sessionConfig, transaction);

      // Create session key account for signing
      const sessionKeyAccount = privateKeyToAccount(
        sessionConfig.sessionPrivateKey as `0x${string}`,
      );

      // ✅ CRITICAL FIX: Use existing smart account instead of creating new one
      const smartAccountClient =
        await this.createSmartAccountClientForExistingWallet({
          sessionPrivateKey: sessionConfig.sessionPrivateKey,
          existingSmartWalletAddress: sessionConfig.smartWalletAddress,
          chainId: transaction.chainId,
        });

      this.logger.log(
        'Using existing smart account with session key delegation',
        {
          existingSmartWalletAddress: sessionConfig.smartWalletAddress,
          sessionKeyAddress: sessionKeyAccount.address,
          chainId: transaction.chainId,
        },
      );

      this.logger.log(
        'Submitting transaction via permissionless.js client on existing smart account',
        {
          existingSmartWalletAddress: sessionConfig.smartWalletAddress,
          to: transaction.to,
          value: transaction.value,
          hasPaymaster: true,
          sessionKeyDelegation: true,
        },
      );

      // Execute the transaction using existing smart account
      const txHash = await smartAccountClient.sendTransaction({
        to: transaction.to as Address,
        value: parseEther(this.validateAndNormalizeValue(transaction.value)),
        data: (transaction.data || '0x') as `0x${string}`,
      });

      this.logger.log(
        '✅ Transaction executed successfully with session key delegation on existing smart account',
        {
          transactionHash: txHash,
          existingSmartWalletAddress: sessionConfig.smartWalletAddress,
          sessionKeyAddress: sessionKeyAccount.address,
          delegationType: 'existing_smart_account',
        },
      );

      // Wait for transaction receipt
      const publicClient = this.createPublicClient(transaction.chainId);
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 60000, // 60 seconds
      });

      return {
        hash: txHash,
        success: receipt.status === 'success',
        status: receipt.status === 'success' ? 'success' : 'failed',
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: Number(receipt.blockNumber),
        explorerUrl: this.getExplorerUrl(transaction.chainId, txHash),
      };
    } catch (error) {
      this.logger.error(
        `Failed to execute transaction with permissionless.js session key: ${error}`,
        {
          smartWalletAddress: sessionConfig.smartWalletAddress,
          sessionKeyAddress: privateKeyToAccount(
            sessionConfig.sessionPrivateKey as `0x${string}`,
          ).address,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );

      return {
        hash: '',
        success: false,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate transaction permissions against session key permissions
   */
  private validateTransactionPermissions(
    sessionConfig: SessionKeyConfig,
    transaction: TransactionRequest,
  ): void {
    // Check if session key is expired
    if (new Date() > sessionConfig.permissions.validUntil) {
      throw new Error('Session key has expired');
    }

    // Check if operation is allowed
    const isTransfer = !transaction.data || transaction.data === '0x';
    const requiredOperation = isTransfer
      ? 'eth_transfer'
      : 'contract_interaction';

    if (!sessionConfig.permissions.operations.includes(requiredOperation)) {
      throw new Error(
        `Operation '${requiredOperation}' is not permitted for this session key`,
      );
    }

    // Check amount limits
    const amount = parseFloat(transaction.value);
    const maxPerTx = parseFloat(sessionConfig.permissions.maxAmountPerTx);

    if (amount > maxPerTx) {
      throw new Error(
        `Transaction amount ${transaction.value} exceeds per-transaction limit of ${sessionConfig.permissions.maxAmountPerTx}`,
      );
    }

    this.logger.debug('Session key permissions validated', {
      operation: requiredOperation,
      amount: transaction.value,
      maxPerTx: sessionConfig.permissions.maxAmountPerTx,
      validUntil: sessionConfig.permissions.validUntil,
    });
  }

  /**
   * CORRECT APPROACH: Use the existing funded smart account with session key for signing
   * The session key should sign transactions on behalf of the user's existing smart account
   */
  private async createSmartAccountClientForExistingWallet(config: {
    sessionPrivateKey: string;
    existingSmartWalletAddress: string;
    chainId: number;
  }): Promise<any> {
    try {
      const chain = this.getChainConfig(config.chainId);
      const publicClient = this.createPublicClient(config.chainId);
      const pimlicoClient = this.createPimlicoClient(config.chainId);

      // Create session key account for signing
      const sessionKeyAccount = privateKeyToAccount(
        config.sessionPrivateKey as `0x${string}`,
      );

      this.logger.log(
        'Using existing funded smart account with session key delegation',
        {
          existingSmartWalletAddress: config.existingSmartWalletAddress,
          sessionKeyAddress: sessionKeyAccount.address,
          chainId: config.chainId,
          approach: 'true_session_key_delegation',
        },
      );

      // Check if the existing smart account is deployed and has balance
      const code = await publicClient.getBytecode({
        address: config.existingSmartWalletAddress as `0x${string}`,
      });

      const balance = await publicClient.getBalance({
        address: config.existingSmartWalletAddress as `0x${string}`,
      });

      this.logger.log('Existing smart account status', {
        smartAccountAddress: config.existingSmartWalletAddress,
        isDeployed: !!(code && code !== '0x'),
        balance: balance.toString(),
        hasBalance: balance > 0n,
      });

      // Create a custom smart account object that represents the existing funded smart account
      // but uses the session key for signing
      const existingSmartAccount = {
        address: config.existingSmartWalletAddress as `0x${string}`,
        source: 'existing_funded_smart_account',

        // Use session key for signing transactions
        async signMessage({ message }: { message: any }) {
          return sessionKeyAccount.signMessage({ message });
        },

        async signTransaction(transaction: any) {
          return sessionKeyAccount.signTransaction(transaction);
        },

        async signTypedData(typedData: any) {
          return sessionKeyAccount.signTypedData(typedData);
        },

        // UserOperation signing for AA
        async signUserOperation(userOperation: any) {
          // The session key signs the UserOperation on behalf of the existing smart account
          const userOpHash = getUserOperationHash({
            userOperation,
            entryPoint: entryPoint07Address,
            chainId: config.chainId,
          });
          return sessionKeyAccount.signMessage({
            message: { raw: userOpHash },
          });
        },

        // Required properties for smart account
        type: 'local' as const,
        publicKey: sessionKeyAccount.publicKey,
        experimental_signAuthorization:
          sessionKeyAccount.experimental_signAuthorization,
      };

      // Create smart account client using the existing smart account with session key signing
      const smartAccountClient = createSmartAccountClient({
        account: existingSmartAccount as any,
        chain: chain,
        bundlerTransport: http(
          `https://api.pimlico.io/v2/${config.chainId}/rpc?apikey=${this.pimlicoApiKey}`,
        ),
        paymaster: pimlicoClient,
        userOperation: {
          estimateFeesPerGas: async () => {
            return (await pimlicoClient.getUserOperationGasPrice()).fast;
          },
        },
      });

      this.logger.log(
        '✅ Smart account client created for existing funded account with session key delegation',
        {
          existingSmartAccountAddress: config.existingSmartWalletAddress,
          sessionKeyAddress: sessionKeyAccount.address,
          hasPaymaster: true,
          usesExistingBalance: true,
          delegationType: 'session_key_signing',
        },
      );

      return smartAccountClient;
    } catch (error) {
      this.logger.error(
        `Failed to create client for existing smart account: ${error}`,
        {
          existingSmartWalletAddress: config.existingSmartWalletAddress,
          sessionKeyAddress: privateKeyToAccount(
            config.sessionPrivateKey as `0x${string}`,
          ).address,
          chainId: config.chainId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );
      throw new Error(
        `Failed to create client for existing smart account: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Validate and normalize transaction value
   */
  private validateAndNormalizeValue(value: string): string {
    if (!value && value !== '0') {
      throw new Error('Transaction value is required');
    }

    // Handle empty or null values
    if (value === '' || value === null || value === undefined) {
      return '0';
    }

    // Convert to string and trim whitespace
    const valueStr = String(value).trim();

    // Handle empty string after trim
    if (valueStr === '') {
      return '0';
    }

    // Check if it's a valid number
    const numValue = parseFloat(valueStr);
    if (isNaN(numValue)) {
      throw new Error(
        `Invalid transaction value: ${valueStr}. Must be a valid number.`,
      );
    }

    // Check for negative values
    if (numValue < 0) {
      throw new Error(
        `Invalid transaction value: ${valueStr}. Cannot be negative.`,
      );
    }

    // Return normalized value as string
    return numValue.toString();
  }

  /**
   * Get explorer URL for transaction
   */
  private getExplorerUrl(chainId: number, txHash: string): string {
    const explorerUrls: Record<number, string> = {
      1328: 'https://seitrace.com', // SEI Testnet
      11155111: 'https://sepolia.etherscan.io', // Sepolia
      8453: 'https://basescan.org', // Base
      84532: 'https://sepolia.basescan.org', // Base Sepolia
    };

    const baseUrl = explorerUrls[chainId];
    return baseUrl ? `${baseUrl}/tx/${txHash}` : '';
  }

  /**
   * Deploy smart wallet if needed (delegated to permissionless.js)
   */
  async deploySmartWalletIfNeeded(
    smartWalletAddress: string,
    ownerPrivateKey: string,
    chainId: number,
  ): Promise<{
    deployed: boolean;
    deploymentHash?: string;
    error?: string;
  }> {
    try {
      const publicClient = this.createPublicClient(chainId);

      // Check if account has code
      const code = await publicClient.getBytecode({
        address: smartWalletAddress as Address,
      });

      if (code && code !== '0x') {
        this.logger.log(`Smart wallet already deployed`, {
          smartWalletAddress,
          chainId,
        });
        return { deployed: true };
      }

      this.logger.log(
        `Smart wallet deployment needed - will be handled by permissionless.js on first transaction`,
        {
          smartWalletAddress,
          chainId,
        },
      );

      // Permissionless.js handles deployment automatically on first transaction
      return {
        deployed: false, // Will be deployed on first transaction
      };
    } catch (error) {
      this.logger.error(`Failed to check wallet deployment: ${error}`, {
        smartWalletAddress,
        chainId,
      });
      return {
        deployed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
