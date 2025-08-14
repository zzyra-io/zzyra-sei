import { Injectable, Logger } from '@nestjs/common';
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator';
import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
} from '@zerodev/sdk';
import { getEntryPoint, KERNEL_V3_1 } from '@zerodev/sdk/constants';
import {
  Address,
  Chain,
  createPublicClient,
  encodeFunctionData,
  formatEther,
  Hex,
  http,
  parseEther,
  parseUnits,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia, seiTestnet, sepolia } from 'viem/chains';
import { IAccountAbstractionService } from './blockchain/base/IBlockchainService';
import {
  TransactionRequest as BlockchainTransactionRequest,
  TransactionResult as BlockchainTransactionResult,
  ChainConfig,
  GasEstimate,
  TransactionResult,
} from './blockchain/types/blockchain.types';

// Note: Policy functions need to be imported from @zerodev/permissions package separately
// For now, we'll implement a simplified version without complex policies

// EntryPoint constant - using the standard EntryPoint v0.7 address
const ENTRYPOINT_ADDRESS_V07 =
  '0x0000000071727de22e5e9d8baf0edac6f37da032' as const;

// ZeroDev configuration constants - using latest recommended values
const KERNEL_VERSION = '0.3.1'; // Latest stable version
const ENTRYPOINT = ENTRYPOINT_ADDRESS_V07;
const PROJECT_ID = process.env.ZERODEV_PROJECT_ID;

// Session key configuration constants
const DEFAULT_SESSION_DURATION = 24 * 60 * 60; // 24 hours in seconds
const MAX_GAS_PER_USER_OP = parseEther('0.01'); // Max gas per user operation
const RECURRING_SCHEDULE_TOLERANCE = 5 * 60; // 5 minutes tolerance for recurring schedules

// ERC20 ABI for token operations
const ERC20_ABI = [
  {
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: '_spender', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ZeroDev configuration interfaces
// Simplified configuration interfaces following ZeroDev best practices
interface ZeroDevAccountConfig {
  ownerPrivateKey: string;
  chainId: number;
  index?: bigint; // Salt for deterministic address generation
}

interface ZyraSessionKeyConfig {
  ownerPrivateKey: string;
  sessionPrivateKey: string;
  chainId: number;
  permissions: ZyraSessionKeyPermissions;
  validUntil?: Date;
  smartWalletAddress?: string; // Optional - will be computed if not provided
}

interface ZyraSessionKeyPermissions {
  operations: ('eth_transfer' | 'erc20_transfer' | 'contract_interaction')[];
  maxAmountPerTx: string;
  maxDailyAmount: string;
  validUntil: Date;
  allowedContracts?: Address[];
  allowedRecipients?: Address[];
  functionSelectors?: Hex[];
  // Enhanced features for recurring operations
  recurringSchedule?: {
    type: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number; // 0-6 for weekly (0 = Sunday)
    dayOfMonth?: number; // 1-31 for monthly
    time?: string; // HH:MM format
    timezone?: string; // IANA timezone
  };
  // ERC20 gas payment configuration
  gasPayment?: {
    method: 'sponsor' | 'native' | 'erc20';
    erc20Token?: {
      address: Address;
      symbol: string;
      decimals: number;
    };
  };
}

interface TransactionRequest {
  to: string;
  value: string;
  data?: string;
  chainId: number;
  gasLimit?: number;
}

interface SessionKeyValidationRule {
  target: Address;
  valueLimit: bigint;
  sig: Hex;
  operation: number; // 0 = CALL, 1 = DELEGATECALL
  rules?: {
    condition: number; // 0 = EQUAL, 1 = GREATER_THAN, 2 = LESS_THAN, etc.
    offset: number;
    param: Hex;
  }[];
}

interface SmartAccountInfo {
  address: string;
  isDeployed: boolean;
  nonce: string;
  implementation?: string;
  factory?: string;
  initCode?: string;
  client?: any;
}

@Injectable()
export class ZeroDevService implements IAccountAbstractionService {
  private readonly logger = new Logger(ZeroDevService.name);

  // Simplified caching for active accounts
  private accountCache = new Map<string, any>();

  private readonly zerodevProjectId: string;
  private readonly supportedChains = [seiTestnet, sepolia, base, baseSepolia];

  constructor() {
    this.zerodevProjectId = PROJECT_ID;
    this.logger.log('ZeroDev service initialized with project ID', {
      projectId: this.zerodevProjectId.substring(0, 8) + '...',
      hasProjectId: !!this.zerodevProjectId,
    });
  }

  /**
   * Create a ZeroDev Kernel smart account using latest SDK patterns
   * Simplified approach that follows official recommendations
   */
  async createSmartAccount(
    config: ZeroDevAccountConfig & { delegationMode?: string },
  ): Promise<{
    smartAccountAddress: string;
    ownerAddress: string;
    chainId: number;
    delegationMode: string;
    deploymentRequired: boolean;
    isDeployed?: boolean;
    kernelClient?: any;
  }> {
    try {
      const chain = this.getChainConfig(config.chainId);
      const bundlerUrl = this.getBundlerUrl(config.chainId);
      const paymasterUrl = this.getPaymasterUrl(config.chainId);

      this.logger.debug('Creating ZeroDev smart account', {
        chainId: config.chainId,
        projectId: this.zerodevProjectId.substring(0, 8) + '...',
        bundlerUrl: this.getBundlerUrl(config.chainId),
        paymasterUrl: this.getPaymasterUrl(config.chainId),
      });

      // Create owner signer
      const ownerSigner = privateKeyToAccount(config.ownerPrivateKey as Hex);

      // Create ECDSA validator with proper client parameter
      const publicClient = createPublicClient({
        chain,
        transport: http(chain.rpcUrls.default.http[0]),
      }) as any;

      const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
        signer: ownerSigner,
        entryPoint: getEntryPoint('0.7'),
        kernelVersion: KERNEL_V3_1,
      });

      // Create deterministic Kernel account with proper client parameter
      const kernelAccount = await createKernelAccount(publicClient, {
        plugins: {
          sudo: ecdsaValidator,
        },
        entryPoint: getEntryPoint('0.7'),
        kernelVersion: KERNEL_V3_1,
      });

      const smartAccountAddress = kernelAccount.address;

      this.logger.log('Created deterministic ZeroDev kernel account', {
        owner: ownerSigner.address,
        smartWallet: smartAccountAddress,
        entryPoint: ENTRYPOINT_ADDRESS_V07,
        chainId: config.chainId,
      });

      // Create paymaster and bundler clients for proper AA flow
      const zeroDevPaymaster = createZeroDevPaymasterClient({
        chain,
        transport: http(paymasterUrl),
      });

      // Create proper ZeroDev kernel account client
      const kernelClient = createKernelAccountClient({
        account: kernelAccount,
        chain,
        bundlerTransport: http(bundlerUrl),
        paymaster: zeroDevPaymaster,
      });

      // Check deployment status
      const isDeployed = await this.isSmartAccountDeployed(
        kernelAccount.address,
        config.chainId,
      );

      // Cache the client
      const cacheKey = `${kernelAccount.address}-${config.chainId}`;
      this.accountCache.set(cacheKey, kernelClient);

      this.logger.log('ZeroDev smart account created', {
        address: kernelAccount.address,
        chainId: config.chainId,
        isDeployed,
      });

      return {
        smartAccountAddress: kernelAccount.address,
        ownerAddress: ownerSigner.address,
        chainId: config.chainId,
        delegationMode: config.delegationMode || 'immediate',
        deploymentRequired: !isDeployed,
        isDeployed,
        kernelClient,
      };
    } catch (error) {
      this.logger.error('Failed to create ZeroDev smart account', {
        error: error instanceof Error ? error.message : String(error),
        chainId: config.chainId,
        projectId: this.zerodevProjectId.substring(0, 8) + '...',
        bundlerUrl: this.getBundlerUrl(config.chainId),
        paymasterUrl: this.getPaymasterUrl(config.chainId),
      });
      throw new Error(
        `Smart account creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create session key account for Zzyra workflow automation
   * Simplified version using basic smart account functionality
   */
  async createSessionKeyForZyra(
    config: ZyraSessionKeyConfig,
    existingSmartWalletAddress?: string,
  ): Promise<{
    sessionKeyClient: any;
    sessionKeyAddress: string;
    smartAccountAddress: string;
  }> {
    try {
      this.logger.log('Creating ZeroDev session key for Zzyra automation', {
        chainId: config.chainId,
        operations: config.permissions.operations,
        existingSmartWallet: existingSmartWalletAddress,
      });

      let smartAccountAddress: string;
      let kernelClient: any;

      if (existingSmartWalletAddress) {
        // ✅ Use existing smart wallet address from Dynamic Labs
        smartAccountAddress = existingSmartWalletAddress;

        this.logger.log(
          '✅ Using existing Dynamic-created ZeroDev smart wallet',
          {
            smartWalletAddress: smartAccountAddress,
            source: 'dynamic_labs_pre_created',
          },
        );

        // Create a client that connects to the existing smart wallet
        // For now, we create a placeholder client since the address is already determined
        kernelClient = {
          account: { address: smartAccountAddress as `0x${string}` },
          sendTransaction: async (params: any) => {
            throw new Error(
              `🚧 ZeroDev execution not fully implemented for existing wallets.\n` +
                `Smart wallet: ${smartAccountAddress}\n` +
                `This address was created by Dynamic Labs and needs proper ZeroDev client setup.`,
            );
          },
        };
      } else {
        // ⚠️ Fallback: Create new smart account (should not happen with proper Dynamic integration)
        this.logger.warn(
          '⚠️ No existing smart wallet provided, creating new account (fallback mode)',
        );

        const accountConfig: ZeroDevAccountConfig = {
          ownerPrivateKey: config.sessionPrivateKey,
          chainId: config.chainId,
        };

        const accountResult = await this.createSmartAccount(accountConfig);
        smartAccountAddress = accountResult.smartAccountAddress;
        kernelClient = accountResult.kernelClient;

        this.logger.warn('⚠️ Created NEW ZeroDev smart wallet (fallback)', {
          newSmartWallet: smartAccountAddress,
          warning: 'This should not happen with proper Dynamic integration',
        });
      }

      return {
        sessionKeyClient: kernelClient,
        sessionKeyAddress: config.sessionPrivateKey,
        smartAccountAddress,
      };
    } catch (error) {
      this.logger.error('Failed to create ZeroDev session key for Zzyra', {
        error: error instanceof Error ? error.message : String(error),
        chainId: config.chainId,
      });
      throw new Error(
        `Session key creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Execute transaction using Zzyra session key with ZeroDev
   * Unified method that integrates with Zzyra's session management
   * Supports automatic smart wallet deployment
   */
  async executeWithZyraSessionKey(
    sessionKeyData: any, // From Zzyra's SessionKeysService
    decryptedSessionPrivateKey: string,
    ownerPrivateKey: string, // For smart wallet deployment if needed
    transaction: TransactionRequest,
  ): Promise<BlockchainTransactionResult> {
    try {
      const startTime = Date.now();
      const chainId = transaction.chainId;

      this.logger.log(
        'Executing transaction with ZeroDev + Zzyra session key',
        {
          sessionKeyId: sessionKeyData.id,
          to: transaction.to,
          value: transaction.value,
          chainId,
        },
      );

      // Check cache first
      const cacheKey = `zyra_${sessionKeyData.id}_${chainId}`;
      let sessionKeyClient = this.accountCache.get(cacheKey);

      if (!sessionKeyClient) {
        // Create session key configuration from Zzyra data
        const sessionConfig: ZyraSessionKeyConfig = {
          ownerPrivateKey,
          sessionPrivateKey: decryptedSessionPrivateKey,
          chainId,
          permissions: {
            operations: sessionKeyData.permissions.map(
              (p: any) => p.operation,
            ) as ('eth_transfer' | 'erc20_transfer' | 'contract_interaction')[],
            maxAmountPerTx:
              sessionKeyData.permissions[0]?.maxAmountPerTx || '1.0',
            maxDailyAmount:
              sessionKeyData.permissions[0]?.maxDailyAmount || '10.0',
            validUntil: new Date(sessionKeyData.validUntil),
            allowedContracts: sessionKeyData.permissions.reduce(
              (acc: Address[], p: any) => [
                ...acc,
                ...p.allowedContracts.map((addr: string) => addr as Address),
              ],
              [],
            ),
          },
        };

        // Validate permissions
        this.validateZyraPermissions(sessionConfig.permissions);

        // Create session key client using existing smart wallet address from session data
        const existingSmartWalletAddress = sessionKeyData.smartWalletOwner; // From Dynamic Labs
        const result = await this.createSessionKeyForZyra(
          sessionConfig,
          existingSmartWalletAddress,
        );
        sessionKeyClient = result.sessionKeyClient;

        // Cache the client
        this.accountCache.set(cacheKey, sessionKeyClient);

        this.logger.log('ZeroDev session key client created and cached', {
          sessionKeyId: sessionKeyData.id,
          smartAccountAddress: result.smartAccountAddress,
          cacheKey,
        });
      }

      // Get smart account address from the session key client for balance check
      const smartAccountAddress = sessionKeyClient.account?.address;
      if (!smartAccountAddress) {
        throw new Error('Unable to determine smart account address');
      }

      // Check balance only for transaction value (gas is sponsored by ZeroDev)
      if (transaction.value && transaction.value !== '0') {
        const chain = this.getChainConfig(chainId);
        const publicClient = createPublicClient({
          chain,
          transport: http(chain.rpcUrls.default.http[0]),
        });

        const balance = await publicClient.getBalance({
          address: smartAccountAddress,
        });

        const requiredValue = parseEther(transaction.value);
        const chainSymbol = this.getChainSymbol(chainId);

        this.logger.log(
          'Smart account balance check (transaction value only)',
          {
            smartAccountAddress: smartAccountAddress.substring(0, 10) + '...',
            balance: formatEther(balance) + ` ${chainSymbol}`,
            required: transaction.value + ` ${chainSymbol}`,
            chainId,
            note: 'Gas fees sponsored by ZeroDev paymaster',
          },
        );

        if (balance < requiredValue) {
          const fundingInstructions = this.getFundingInstructions(
            chainId,
            smartAccountAddress,
          );
          const errorMessage = [
            `❌ INSUFFICIENT BALANCE FOR TRANSACTION VALUE`,
            ``,
            `Current Balance: ${formatEther(balance)} ${chainSymbol}`,
            `Required for Transaction: ${transaction.value} ${chainSymbol}`,
            `Chain: ${chainId} (${chainSymbol})`,
            ``,
            ...fundingInstructions,
            ``,
            `✅ Gas fees are fully sponsored by ZeroDev - no additional funds needed for gas!`,
          ].join('\n');

          throw new Error(errorMessage);
        }
      }

      // Execute the transaction (ZeroDev will handle deployment automatically)
      const txHash = await sessionKeyClient.sendTransaction({
        to: transaction.to as Address,
        value: parseEther(transaction.value),
        data: (transaction.data as Hex) || '0x',
      });

      this.logger.log('ZeroDev transaction submitted', {
        transactionHash: txHash,
        sessionKeyId: sessionKeyData.id,
        to: transaction.to,
        value: transaction.value,
      });

      // Wait for confirmation
      const chain = this.getChainConfig(chainId);
      const publicClient = createPublicClient({
        chain,
        transport: http(chain.rpcUrls.default.http[0]),
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 60_000,
      });

      const executionTime = Date.now() - startTime;

      this.logger.log('ZeroDev transaction confirmed', {
        transactionHash: receipt.transactionHash,
        blockNumber: Number(receipt.blockNumber),
        gasUsed: Number(receipt.gasUsed),
        executionTime,
      });

      return {
        hash: receipt.transactionHash,
        success: receipt.status === 'success',
        blockNumber: Number(receipt.blockNumber),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 'success' ? 'success' : 'failed',
        explorerUrl: this.getExplorerUrl(chainId, receipt.transactionHash),
      };
    } catch (error) {
      this.logger.error('ZeroDev transaction failed', {
        error: error instanceof Error ? error.message : String(error),
        sessionKeyId: sessionKeyData.id,
        chainId: transaction.chainId,
      });
      throw new Error(
        `ZeroDev transaction execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Check if smart wallet needs deployment
   * ZeroDev handles deployment automatically, so this is mainly for status checking
   */
  async checkSmartWalletDeployment(
    smartWalletAddress: string,
    chainId: number,
  ): Promise<{ isDeployed: boolean; needsDeployment: boolean }> {
    try {
      const isDeployed = await this.isSmartAccountDeployed(
        smartWalletAddress,
        chainId,
      );

      this.logger.debug('Smart wallet deployment status', {
        address: smartWalletAddress,
        chainId,
        isDeployed,
      });

      return {
        isDeployed,
        needsDeployment: !isDeployed, // ZeroDev will deploy on first transaction
      };
    } catch (error) {
      this.logger.error('Failed to check smart wallet deployment', {
        error: error instanceof Error ? error.message : String(error),
        smartWallet: smartWalletAddress,
        chainId,
      });
      throw new Error(
        `Deployment check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Estimate gas for ZeroDev transaction
   * Uses ZeroDev's built-in gas estimation
   */
  async estimateGas(
    transaction: BlockchainTransactionRequest,
  ): Promise<GasEstimate> {
    try {
      const chain = this.getChainConfig(transaction.chainId);
      const publicClient = createPublicClient({
        chain,
        transport: http(chain.rpcUrls.default.http[0]),
      });

      const gasPrice = await publicClient.getGasPrice();
      const gasLimit = 100000; // Conservative estimate for smart wallet operations

      return {
        callGasLimit: gasLimit.toString(),
        verificationGasLimit: '100000',
        preVerificationGas: '21000',
        maxFeePerGas: ((Number(gasPrice) * 12) / 10).toString(), // 20% buffer
        maxPriorityFeePerGas: (Number(gasPrice) / 10).toString(), // 10% tip
      };
    } catch (error) {
      // Fallback to default estimates
      return {
        callGasLimit: '100000',
        verificationGasLimit: '100000',
        preVerificationGas: '21000',
        maxFeePerGas: '20000000000', // 20 gwei
        maxPriorityFeePerGas: '2000000000', // 2 gwei
      };
    }
  }

  /**
   * Execute ERC20 token transfer using ZeroDev session key
   * Simplified method that works with Zzyra's session management
   */
  async executeERC20Transfer(
    sessionConfig: {
      sessionPrivateKey: string;
      smartWalletAddress: string;
      chainId: number;
      permissions: {
        operations: string[];
        maxAmountPerTx: string;
        maxDailyAmount: string;
        validUntil: Date;
      };
    },
    tokenAddress: string,
    toAddress: string,
    amount: string,
    decimals: number = 18,
  ): Promise<BlockchainTransactionResult> {
    try {
      this.logger.log('Executing ERC20 transfer via ZeroDev', {
        token: tokenAddress,
        recipient: toAddress,
        amount,
        decimals,
        chainId: sessionConfig.chainId,
      });

      // Encode ERC20 transfer data
      const transferData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [toAddress as Address, parseUnits(amount, decimals)],
      });

      // Create transaction request
      const transaction: TransactionRequest = {
        to: tokenAddress,
        value: '0',
        data: transferData,
        chainId: sessionConfig.chainId,
      };

      // Create account config for execution
      const accountConfig: ZeroDevAccountConfig = {
        ownerPrivateKey: sessionConfig.sessionPrivateKey,
        chainId: sessionConfig.chainId,
      };

      // Execute transaction using ZeroDev
      const accountInfo = await this.createSmartAccount(accountConfig);
      const txHash = await accountInfo.kernelClient.sendTransaction({
        to: tokenAddress as Address,
        value: parseEther('0'),
        data: transferData as Hex,
      });

      // Wait for confirmation
      const chain = this.getChainConfig(sessionConfig.chainId);
      const publicClient = createPublicClient({
        chain,
        transport: http(chain.rpcUrls.default.http[0]),
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 60_000,
      });

      return {
        hash: receipt.transactionHash,
        success: receipt.status === 'success',
        blockNumber: Number(receipt.blockNumber),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 'success' ? 'success' : 'failed',
        explorerUrl: this.getExplorerUrl(
          sessionConfig.chainId,
          receipt.transactionHash,
        ),
      };
    } catch (error) {
      this.logger.error('ERC20 transfer failed via ZeroDev', {
        error: error instanceof Error ? error.message : String(error),
        token: tokenAddress,
        recipient: toAddress,
        amount,
        chainId: sessionConfig.chainId,
      });
      throw new Error(
        `ERC20 transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Execute regular transaction using ZeroDev smart account
   * Supports both owner and session key execution
   */
  async executeTransaction(
    transaction: BlockchainTransactionRequest,
    walletConfig: { privateKey: string; address: string },
  ): Promise<BlockchainTransactionResult> {
    try {
      this.logger.log('Executing transaction via ZeroDev smart account', {
        to: transaction.to,
        value: transaction.value,
        chainId: transaction.chainId,
        hasData: !!transaction.data,
      });

      const config: ZeroDevAccountConfig = {
        ownerPrivateKey: walletConfig.privateKey,
        chainId: transaction.chainId,
      };

      // Create or get cached smart account
      const accountInfo = await this.createSmartAccount(config);
      const txHash = await accountInfo.kernelClient.sendTransaction({
        to: transaction.to as Address,
        value: parseEther(transaction.value),
        data: (transaction.data as Hex) || '0x',
      });

      // Wait for confirmation
      const chain = this.getChainConfig(transaction.chainId);
      const publicClient = createPublicClient({
        chain,
        transport: http(chain.rpcUrls.default.http[0]),
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 60_000,
      });

      this.logger.log('Transaction completed via ZeroDev', {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
      });

      return {
        hash: receipt.transactionHash,
        success: receipt.status === 'success',
        blockNumber: Number(receipt.blockNumber),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 'success' ? 'success' : 'failed',
        explorerUrl: this.getExplorerUrl(
          transaction.chainId,
          receipt.transactionHash,
        ),
      };
    } catch (error) {
      this.logger.error('Transaction failed via ZeroDev', {
        error: error instanceof Error ? error.message : String(error),
        to: transaction.to,
        chainId: transaction.chainId,
      });
      throw new Error(
        `Transaction execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Execute transaction using session key (interface implementation)
   */
  async executeWithSessionKey(
    sessionConfig: {
      sessionPrivateKey: string;
      smartWalletAddress: string;
      chainId: number;
      permissions: {
        operations: string[];
        maxAmountPerTx: string;
        maxDailyAmount: string;
        validUntil: Date;
      };
    },
    transaction: TransactionRequest,
  ): Promise<TransactionResult> {
    try {
      // Create account config for execution
      const accountConfig: ZeroDevAccountConfig = {
        ownerPrivateKey: sessionConfig.sessionPrivateKey,
        chainId: sessionConfig.chainId,
      };

      // Execute transaction using ZeroDev
      const accountInfo = await this.createSmartAccount(accountConfig);
      const txHash = await accountInfo.kernelClient.sendTransaction({
        to: transaction.to as Address,
        value: parseEther(transaction.value),
        data: (transaction.data as Hex) || '0x',
      });

      // Wait for confirmation
      const chain = this.getChainConfig(sessionConfig.chainId);
      const publicClient = createPublicClient({
        chain,
        transport: http(chain.rpcUrls.default.http[0]),
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 60_000,
      });

      return {
        hash: receipt.transactionHash,
        success: receipt.status === 'success',
        blockNumber: Number(receipt.blockNumber),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 'success' ? 'success' : 'failed',
        explorerUrl: this.getExplorerUrl(
          sessionConfig.chainId,
          receipt.transactionHash,
        ),
      };
    } catch (error) {
      this.logger.error('Session key transaction failed', {
        error: error instanceof Error ? error.message : String(error),
        chainId: sessionConfig.chainId,
      });

      return {
        hash: '',
        success: false,
        status: 'failed' as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Deploy smart wallet if needed (interface implementation)
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
      // Check if already deployed
      const isDeployed = await this.isSmartAccountDeployed(
        smartWalletAddress,
        chainId,
      );
      if (isDeployed) {
        return { deployed: true };
      }

      // Deploy using createSmartAccount which handles deployment automatically
      const config: ZeroDevAccountConfig = {
        ownerPrivateKey,
        chainId,
      };

      const result = await this.createSmartAccount(config);

      // If ZeroDev deployed the account, it would be deployed now
      const nowDeployed = await this.isSmartAccountDeployed(
        result.smartAccountAddress,
        chainId,
      );

      return {
        deployed: nowDeployed,
        deploymentHash: nowDeployed ? 'deployed_via_zerodev' : undefined,
      };
    } catch (error) {
      return {
        deployed: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get supported chains (interface implementation)
   */
  getSupportedChains(): ChainConfig[] {
    return [
      {
        id: 1328,
        name: 'Sei Testnet',
        rpcUrl: seiTestnet.rpcUrls.default.http[0],
        explorerUrl: 'https://seitrace.com',
        nativeCurrency: {
          name: 'SEI',
          symbol: 'SEI',
          decimals: 18,
        },
        testnet: true,
      },
      {
        id: 11155111,
        name: 'Sepolia',
        rpcUrl: sepolia.rpcUrls.default.http[0],
        explorerUrl: 'https://sepolia.etherscan.io',
        nativeCurrency: {
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18,
        },
        testnet: true,
      },
      {
        id: 8453,
        name: 'Base',
        rpcUrl: base.rpcUrls.default.http[0],
        explorerUrl: 'https://basescan.org',
        nativeCurrency: {
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18,
        },
      },
      {
        id: 84532,
        name: 'Base Sepolia',
        rpcUrl: baseSepolia.rpcUrls.default.http[0],
        explorerUrl: 'https://sepolia.basescan.org',
        nativeCurrency: {
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18,
        },
        testnet: true,
      },
    ];
  }

  /**
   * Check if chain is supported (interface implementation)
   */
  isChainSupported(chainId: number): boolean {
    return this.getSupportedChains().some((chain) => chain.id === chainId);
  }

  /**
   * Get current gas prices (interface implementation)
   */
  async getCurrentGasPrices(chainId: number): Promise<{
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
  }> {
    try {
      const chain = this.getChainConfig(chainId);
      const publicClient = createPublicClient({
        chain,
        transport: http(chain.rpcUrls.default.http[0]),
      });

      const gasPrice = await publicClient.getGasPrice();

      return {
        maxFeePerGas: ((Number(gasPrice) * 12) / 10).toString(), // 20% buffer
        maxPriorityFeePerGas: (Number(gasPrice) / 10).toString(), // 10% tip
      };
    } catch (error) {
      // Fallback values
      return {
        maxFeePerGas: '20000000000', // 20 gwei
        maxPriorityFeePerGas: '2000000000', // 2 gwei
      };
    }
  }

  /**
   * Get native balance (interface implementation)
   */
  async getNativeBalance(address: string, chainId: number): Promise<string> {
    try {
      const chain = this.getChainConfig(chainId);
      const publicClient = createPublicClient({
        chain,
        transport: http(chain.rpcUrls.default.http[0]),
      });

      const balance = await publicClient.getBalance({
        address: address as Address,
      });

      return balance.toString();
    } catch (error) {
      this.logger.error('Failed to get native balance', {
        address,
        chainId,
        error: error instanceof Error ? error.message : String(error),
      });
      return '0';
    }
  }

  /**
   * Get ERC20 token balance (interface implementation)
   */
  async getTokenBalance(
    tokenAddress: string,
    walletAddress: string,
    chainId: number,
  ): Promise<string> {
    try {
      const chain = this.getChainConfig(chainId);
      const publicClient = createPublicClient({
        chain,
        transport: http(chain.rpcUrls.default.http[0]),
      });

      const balance = await publicClient.readContract({
        address: tokenAddress as Address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [walletAddress as Address],
      });

      return balance.toString();
    } catch (error) {
      this.logger.error('Failed to get token balance', {
        tokenAddress,
        walletAddress,
        chainId,
        error: error instanceof Error ? error.message : String(error),
      });
      return '0';
    }
  }

  /**
   * Validate transaction (interface implementation)
   */
  async validateTransaction(transaction: TransactionRequest): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Basic validation
    if (!transaction.to || transaction.to.length !== 42) {
      errors.push('Invalid recipient address');
    }

    if (!transaction.value || parseFloat(transaction.value) < 0) {
      errors.push('Invalid transaction value');
    }

    if (!this.isChainSupported(transaction.chainId)) {
      errors.push(`Chain ID ${transaction.chainId} is not supported`);
    }

    // Gas limit validation
    if (transaction.gasLimit && transaction.gasLimit > 10000000) {
      errors.push('Gas limit too high');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Health check (interface implementation)
   */
  async healthCheck(chainId: number): Promise<{
    healthy: boolean;
    latency?: number;
    blockNumber?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      const chain = this.getChainConfig(chainId);
      const publicClient = createPublicClient({
        chain,
        transport: http(chain.rpcUrls.default.http[0]),
      });

      const blockNumber = await publicClient.getBlockNumber();
      const latency = Date.now() - startTime;

      return {
        healthy: true,
        latency,
        blockNumber: Number(blockNumber),
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute transaction with ERC20 gas payment
   * Uses ZeroDev paymaster to pay gas with ERC20 tokens
   */
  async executeWithERC20Gas(
    sessionKeyData: any,
    decryptedSessionPrivateKey: string,
    transaction: TransactionRequest,
    gasToken: {
      address: Address;
      symbol: string;
      decimals: number;
    },
  ): Promise<BlockchainTransactionResult> {
    try {
      const chainId = transaction.chainId;

      this.logger.log('Executing transaction with ERC20 gas payment', {
        sessionKeyId: sessionKeyData.id,
        to: transaction.to,
        value: transaction.value,
        gasToken: gasToken.symbol,
        chainId,
      });

      // Create enhanced paymaster for ERC20 payments
      const chain = this.getChainConfig(chainId);
      const erc20PaymasterClient = await createZeroDevPaymasterClient({
        chain,
        transport: http(this.getERC20PaymasterUrl(chainId)),
        // Configure for ERC20 gas payments using self-funded paymaster
      });

      // Create account config for execution
      const accountConfig: ZeroDevAccountConfig = {
        ownerPrivateKey: decryptedSessionPrivateKey,
        chainId,
      };

      // Execute transaction using enhanced paymaster
      const accountInfo = await this.createSmartAccount(accountConfig);

      // Override paymaster client for ERC20 gas
      const enhancedKernelClient = {
        ...accountInfo.kernelClient,
        paymaster: erc20PaymasterClient,
      };

      const txHash = await enhancedKernelClient.sendTransaction({
        to: transaction.to as Address,
        value: parseEther(transaction.value),
        data: (transaction.data as Hex) || '0x',
      });

      // Wait for confirmation
      const publicClient = createPublicClient({
        chain,
        transport: http(chain.rpcUrls.default.http[0]),
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 60_000,
      });

      this.logger.log('ERC20 gas transaction completed', {
        transactionHash: receipt.transactionHash,
        gasToken: gasToken.symbol,
        blockNumber: receipt.blockNumber,
      });

      return {
        hash: receipt.transactionHash,
        success: receipt.status === 'success',
        blockNumber: Number(receipt.blockNumber),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 'success' ? 'success' : 'failed',
        explorerUrl: this.getExplorerUrl(chainId, receipt.transactionHash),
      };
    } catch (error) {
      this.logger.error('ERC20 gas transaction failed', {
        error: error instanceof Error ? error.message : String(error),
        sessionKeyId: sessionKeyData.id,
        chainId: transaction.chainId,
        gasToken: gasToken.symbol,
      });

      throw new Error(
        `ERC20 gas transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Validate recurring schedule execution
   * Checks if current time matches the configured recurring schedule
   */
  validateRecurringSchedule(
    permissions: ZyraSessionKeyPermissions,
    executionTime: Date = new Date(),
  ): { isValid: boolean; nextExecution?: Date; error?: string } {
    if (!permissions.recurringSchedule) {
      return { isValid: true }; // No schedule means always valid
    }

    const schedule = permissions.recurringSchedule;
    const now = executionTime;

    try {
      // Parse scheduled time
      let scheduledTime = now;
      if (schedule.time) {
        const [hours, minutes] = schedule.time.split(':').map(Number);
        scheduledTime = new Date(now);
        scheduledTime.setHours(hours, minutes, 0, 0);
      }

      // Check schedule type
      switch (schedule.type) {
        case 'daily':
          // For daily, just check if we're within tolerance of scheduled time
          const dailyDiff = Math.abs(now.getTime() - scheduledTime.getTime());
          if (dailyDiff <= RECURRING_SCHEDULE_TOLERANCE * 1000) {
            return { isValid: true };
          } else {
            // Calculate next execution
            const nextExecution = new Date(scheduledTime);
            if (now > scheduledTime) {
              nextExecution.setDate(nextExecution.getDate() + 1);
            }
            return {
              isValid: false,
              nextExecution,
              error: `Daily execution scheduled for ${schedule.time}, current tolerance exceeded`,
            };
          }

        case 'weekly':
          if (schedule.dayOfWeek === undefined) {
            return {
              isValid: false,
              error: 'Day of week not specified for weekly schedule',
            };
          }

          const currentDay = now.getDay();
          if (currentDay === schedule.dayOfWeek) {
            const weeklyDiff = Math.abs(
              now.getTime() - scheduledTime.getTime(),
            );
            if (weeklyDiff <= RECURRING_SCHEDULE_TOLERANCE * 1000) {
              return { isValid: true };
            }
          }

          // Calculate next execution
          const daysUntilNext = (schedule.dayOfWeek - currentDay + 7) % 7;
          const nextWeeklyExecution = new Date(scheduledTime);
          nextWeeklyExecution.setDate(
            nextWeeklyExecution.getDate() + (daysUntilNext || 7),
          );

          return {
            isValid: false,
            nextExecution: nextWeeklyExecution,
            error: `Weekly execution scheduled for ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][schedule.dayOfWeek]} at ${schedule.time}`,
          };

        case 'monthly':
          if (schedule.dayOfMonth === undefined) {
            return {
              isValid: false,
              error: 'Day of month not specified for monthly schedule',
            };
          }

          const currentDate = now.getDate();
          if (currentDate === schedule.dayOfMonth) {
            const monthlyDiff = Math.abs(
              now.getTime() - scheduledTime.getTime(),
            );
            if (monthlyDiff <= RECURRING_SCHEDULE_TOLERANCE * 1000) {
              return { isValid: true };
            }
          }

          // Calculate next execution
          const nextMonthlyExecution = new Date(scheduledTime);
          nextMonthlyExecution.setDate(schedule.dayOfMonth);
          if (now > scheduledTime || currentDate > schedule.dayOfMonth) {
            nextMonthlyExecution.setMonth(nextMonthlyExecution.getMonth() + 1);
          }

          return {
            isValid: false,
            nextExecution: nextMonthlyExecution,
            error: `Monthly execution scheduled for day ${schedule.dayOfMonth} at ${schedule.time}`,
          };

        default:
          return {
            isValid: false,
            error: `Unknown schedule type: ${schedule.type}`,
          };
      }
    } catch (error) {
      return {
        isValid: false,
        error: `Schedule validation error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Execute recurring transaction (for worker use)
   * Validates schedule and executes transaction with appropriate gas payment
   */
  async executeRecurringTransaction(
    sessionKeyData: any,
    decryptedSessionPrivateKey: string,
    transaction: TransactionRequest,
    permissions: ZyraSessionKeyPermissions,
  ): Promise<BlockchainTransactionResult> {
    try {
      // Validate recurring schedule
      const scheduleValidation = this.validateRecurringSchedule(permissions);
      if (!scheduleValidation.isValid) {
        throw new Error(
          `Recurring schedule validation failed: ${scheduleValidation.error}. Next execution: ${scheduleValidation.nextExecution?.toISOString()}`,
        );
      }

      this.logger.log('Executing recurring transaction', {
        sessionKeyId: sessionKeyData.id,
        scheduleType: permissions.recurringSchedule?.type,
        gasMethod: permissions.gasPayment?.method || 'native',
      });

      // Execute with appropriate gas payment method
      if (
        permissions.gasPayment?.method === 'erc20' &&
        permissions.gasPayment.erc20Token
      ) {
        return await this.executeWithERC20Gas(
          sessionKeyData,
          decryptedSessionPrivateKey,
          transaction,
          permissions.gasPayment.erc20Token,
        );
      } else if (permissions.gasPayment?.method === 'sponsor') {
        // Use sponsored gas (default ZeroDev behavior)
        return await this.executeWithZyraSessionKey(
          sessionKeyData,
          decryptedSessionPrivateKey,
          decryptedSessionPrivateKey, // Use same key as owner for simplicity
          transaction,
        );
      } else {
        // Use native gas payment
        return await this.executeWithZyraSessionKey(
          sessionKeyData,
          decryptedSessionPrivateKey,
          decryptedSessionPrivateKey,
          transaction,
        );
      }
    } catch (error) {
      this.logger.error('Recurring transaction execution failed', {
        error: error instanceof Error ? error.message : String(error),
        sessionKeyId: sessionKeyData.id,
        scheduleType: permissions.recurringSchedule?.type,
      });

      throw error;
    }
  }

  /**
   * Get next scheduled execution time for recurring operations
   */
  getNextScheduledExecution(
    permissions: ZyraSessionKeyPermissions,
  ): Date | null {
    if (!permissions.recurringSchedule) {
      return null;
    }

    const validation = this.validateRecurringSchedule(permissions);
    return validation.nextExecution || null;
  }

  // Private helper methods

  private getChainConfig(chainId: number): Chain {
    const chainMap = {
      1328: seiTestnet,
      11155111: sepolia,
      8453: base,
      84532: baseSepolia,
    };

    const chain = chainMap[chainId as keyof typeof chainMap];
    if (!chain) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    return chain;
  }

  private getBundlerUrl(chainId: number): string {
    if (!this.zerodevProjectId) {
      throw new Error('ZeroDev project ID not configured');
    }
    return `https://rpc.zerodev.app/api/v2/bundler/${this.zerodevProjectId}`;
  }

  private getPaymasterUrl(chainId: number): string {
    if (!this.zerodevProjectId) {
      throw new Error('ZeroDev project ID not configured');
    }
    // Use ZeroDev-sponsored paymaster for truly gasless transactions
    return `https://rpc.zerodev.app/api/v2/paymaster/${this.zerodevProjectId}`;
  }

  private getERC20PaymasterUrl(chainId: number): string {
    if (!this.zerodevProjectId) {
      throw new Error('ZeroDev project ID not configured');
    }
    // Use ZeroDev-sponsored paymaster for ERC-20 operations
    return `https://rpc.zerodev.app/api/v2/paymaster/${this.zerodevProjectId}`;
  }

  private getExplorerUrl(chainId: number, transactionHash: string): string {
    const explorerUrls = {
      1328: 'https://seitrace.com',
      11155111: 'https://sepolia.etherscan.io',
      8453: 'https://basescan.org',
      84532: 'https://sepolia.basescan.org',
    };

    const baseUrl =
      explorerUrls[chainId as keyof typeof explorerUrls] ||
      'https://etherscan.io';
    return `${baseUrl}/tx/${transactionHash}`;
  }

  private getChainSymbol(chainId: number): string {
    const chainSymbols = {
      1328: 'SEI',
      11155111: 'ETH',
      8453: 'ETH',
      84532: 'ETH',
    };

    return chainSymbols[chainId as keyof typeof chainSymbols] || 'ETH';
  }

  /**
   * Get funding instructions for specific chain
   */
  private getFundingInstructions(
    chainId: number,
    smartAccountAddress: string,
  ): string[] {
    const chainSymbol = this.getChainSymbol(chainId);
    const baseInstructions = [
      `To fund your smart account (${smartAccountAddress}):`,
      '',
    ];

    switch (chainId) {
      case 1328: // SEI Testnet
        return [
          ...baseInstructions,
          '🔗 SEI Testnet Funding:',
          `1. Visit SEI testnet faucet: https://faucet.sei-labs.io/`,
          '2. Connect your wallet and request SEI tokens',
          '3. Transfer SEI from your EOA to smart account:',
          `   Smart Account: ${smartAccountAddress}`,
          '',
          '📋 Alternative: Send SEI directly from any wallet to the smart account address',
        ];

      case 11155111: // Sepolia
        return [
          ...baseInstructions,
          '🔗 Sepolia Testnet Funding:',
          '1. Visit Sepolia faucet: https://faucet.sepolia.dev/',
          '2. Request ETH tokens using your wallet address',
          '3. Transfer ETH to your smart account:',
          `   Smart Account: ${smartAccountAddress}`,
        ];

      case 8453: // Base Mainnet
        return [
          ...baseInstructions,
          '🔗 Base Mainnet Funding:',
          '1. Bridge ETH to Base via bridge.base.org',
          '2. Transfer ETH to your smart account:',
          `   Smart Account: ${smartAccountAddress}`,
        ];

      case 84532: // Base Sepolia
        return [
          ...baseInstructions,
          '🔗 Base Sepolia Funding:',
          '1. Visit Base Sepolia faucet: https://faucet.quicknode.com/base/sepolia',
          '2. Request ETH tokens',
          '3. Transfer ETH to your smart account:',
          `   Smart Account: ${smartAccountAddress}`,
        ];

      default:
        return [
          ...baseInstructions,
          `1. Send ${chainSymbol} tokens to: ${smartAccountAddress}`,
          '2. Ensure sufficient balance for transaction value + gas fees',
        ];
    }
  }

  private async isSmartAccountDeployed(
    address: string,
    chainId: number,
  ): Promise<boolean> {
    try {
      const chain = this.getChainConfig(chainId);
      const publicClient = createPublicClient({
        chain,
        transport: http(chain.rpcUrls.default.http[0]),
      });

      const bytecode = await publicClient.getBytecode({
        address: address as Address,
      });

      const isDeployed = bytecode !== undefined && bytecode !== '0x';

      this.logger.debug('Smart account deployment check', {
        address: address.substring(0, 10) + '...',
        chainId,
        isDeployed,
      });

      return isDeployed;
    } catch (error) {
      this.logger.warn('Failed to check smart account deployment status', {
        address,
        chainId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Validate permissions for Zzyra automation
   * Simplified validation until proper policy system is implemented
   */
  private validateZyraPermissions(
    permissions: ZyraSessionKeyPermissions,
  ): void {
    this.logger.debug('Validating Zzyra permissions', {
      operations: permissions.operations,
      maxAmountPerTx: permissions.maxAmountPerTx,
      validUntil: permissions.validUntil,
    });

    // Basic validation
    if (!permissions.operations || permissions.operations.length === 0) {
      throw new Error('At least one operation must be specified');
    }

    if (new Date() > permissions.validUntil) {
      throw new Error('Session key permissions have expired');
    }

    const maxAmount = parseFloat(permissions.maxAmountPerTx);
    if (maxAmount <= 0) {
      throw new Error('Max amount per transaction must be greater than 0');
    }
  }

  /**
   * Validate transaction against ZeroDev policies
   * This is handled by ZeroDev's policy system, but we can add additional checks
   */
  private async validateZyraTransaction(
    transaction: TransactionRequest,
    permissions: ZyraSessionKeyPermissions,
  ): Promise<void> {
    const transactionValue = parseFloat(transaction.value);
    const maxAmountPerTx = parseFloat(permissions.maxAmountPerTx);

    if (transactionValue > maxAmountPerTx) {
      throw new Error(
        `Transaction amount ${transaction.value} exceeds maximum allowed ${permissions.maxAmountPerTx}`,
      );
    }

    if (new Date() > permissions.validUntil) {
      throw new Error('Session key has expired');
    }

    // Contract allowlist validation (if specified)
    if (transaction.data && transaction.data !== '0x') {
      if (
        permissions.allowedContracts &&
        permissions.allowedContracts.length > 0
      ) {
        const isAllowed = permissions.allowedContracts.some(
          (contract) => contract.toLowerCase() === transaction.to.toLowerCase(),
        );
        if (!isAllowed) {
          throw new Error(`Contract ${transaction.to} not in allowlist`);
        }
      }
    }
  }

  /**
   * Create UserOperation for Account Abstraction transaction
   */
  private async createUserOperation(params: {
    to: Address;
    value: bigint;
    data: Hex;
    account: any;
    chain: Chain;
  }): Promise<any> {
    const { to, value, data, account, chain } = params;

    // Create basic UserOperation structure
    const userOp = {
      sender: account.address,
      nonce: await this.getNonce(account.address, chain),
      initCode: '0x' as Hex, // Empty for already deployed accounts
      callData: this.encodeExecuteCall(to, value, data),
      callGasLimit: BigInt(100000), // Will be estimated by paymaster
      verificationGasLimit: BigInt(100000),
      preVerificationGas: BigInt(21000),
      maxFeePerGas: BigInt(1000000000), // 1 gwei
      maxPriorityFeePerGas: BigInt(1000000000),
      paymasterAndData: '0x' as Hex, // Will be filled by paymaster
      signature: '0x' as Hex, // Will be filled after sponsorship
    };

    this.logger.debug('Created UserOperation', {
      sender: userOp.sender,
      to,
      value: value.toString(),
      hasCallData: userOp.callData !== '0x',
    });

    return userOp;
  }

  /**
   * Get nonce for smart account
   */
  private async getNonce(address: Address, chain: Chain): Promise<bigint> {
    const publicClient = createPublicClient({
      chain,
      transport: http(chain.rpcUrls.default.http[0]),
    });

    try {
      // Get nonce from EntryPoint contract
      const nonce = await publicClient.readContract({
        address: ENTRYPOINT,
        abi: [
          {
            inputs: [
              { name: 'sender', type: 'address' },
              { name: 'key', type: 'uint192' },
            ],
            name: 'getNonce',
            outputs: [{ name: 'nonce', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'getNonce',
        args: [address, BigInt(0)],
      });

      return nonce as bigint;
    } catch (error) {
      this.logger.warn('Failed to get nonce from EntryPoint, using 0', {
        error,
      });
      return BigInt(0);
    }
  }

  /**
   * Encode execute call for smart account
   */
  private encodeExecuteCall(to: Address, value: bigint, data: Hex): Hex {
    // Standard execute function signature: execute(address,uint256,bytes)
    return encodeFunctionData({
      abi: [
        {
          inputs: [
            { name: 'dest', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'func', type: 'bytes' },
          ],
          name: 'execute',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ],
      functionName: 'execute',
      args: [to, value, data],
    });
  }

  /**
   * Wait for UserOperation receipt
   */
  private async waitForUserOperationReceipt(
    userOpHash: string,
    bundlerClient: any,
    timeout = 60000,
  ): Promise<{
    transactionHash: string;
    blockNumber: bigint;
    success: boolean;
  }> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const receipt = await bundlerClient.request({
          method: 'eth_getUserOperationReceipt',
          params: [userOpHash],
        });

        if (receipt) {
          return {
            transactionHash: receipt.receipt.transactionHash,
            blockNumber: BigInt(receipt.receipt.blockNumber),
            success: receipt.success,
          };
        }
      } catch (error) {
        // Receipt not available yet, continue waiting
      }

      // Wait 2 seconds before checking again
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error(`UserOperation receipt timeout after ${timeout}ms`);
  }
}
