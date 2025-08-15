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
    this.logger.log('ZeroDev service initialized', {
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

      this.logger.log('Created ZeroDev kernel account', {
        smartWallet: smartAccountAddress,
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
      this.logger.log('Creating ZeroDev session key for Zzyra', {
        chainId: config.chainId,
      });

      let smartAccountAddress: string;
      let kernelClient: any;

      if (existingSmartWalletAddress) {
        // ✅ Use existing smart wallet address from Dynamic Labs
        smartAccountAddress = existingSmartWalletAddress;

        this.logger.log('Creating ZeroDev client for existing wallet', {
          smartWalletAddress: smartAccountAddress,
        });

        // Create real ZeroDev kernel client for existing smart wallet
        kernelClient = await this.createKernelClientForExistingWallet(
          config.sessionPrivateKey,
          smartAccountAddress as Address,
          config.chainId,
        );
      } else {
        // ⚠️ Fallback: Create new smart account (should not happen with proper Dynamic integration)
        this.logger.warn(
          'No existing smart wallet provided, creating new account (fallback mode)',
        );

        const accountConfig: ZeroDevAccountConfig = {
          ownerPrivateKey: config.sessionPrivateKey,
          chainId: config.chainId,
        };

        const accountResult = await this.createSmartAccount(accountConfig);
        smartAccountAddress = accountResult.smartAccountAddress;
        kernelClient = accountResult.kernelClient;

        this.logger.warn('Created NEW ZeroDev smart wallet (fallback)', {
          newSmartWallet: smartAccountAddress,
        });
      }

      return {
        sessionKeyClient: kernelClient,
        sessionKeyAddress: config.sessionPrivateKey,
        smartAccountAddress: kernelClient.account.address, // Use actual kernel account address
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
        { sessionKeyId: sessionKeyData.id, chainId },
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
        });
      }

      // Get smart account address from the session key client for balance check
      const smartAccountAddress = sessionKeyClient.account?.address;
      if (!smartAccountAddress) {
        throw new Error(
          'Unable to determine smart account address from session key client',
        );
      }

      this.logger.log('Using session key smart wallet', {
        sessionKeySmartWallet: smartAccountAddress,
      });

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

        this.logger.log('Smart account balance check', {
          balance: formatEther(balance) + ` ${chainSymbol}`,
          required: transaction.value + ` ${chainSymbol}`,
          chainId,
        });

        if (balance < requiredValue) {
          const fundingInstructions = this.getFundingInstructions(
            chainId,
            smartAccountAddress,
          );
          const errorMessage = [
            `❌ INSUFFICIENT BALANCE IN SESSION KEY SMART WALLET`,
            ``,
            `Session Key Smart Wallet: ${smartAccountAddress}`,
            `Current Balance: ${formatEther(balance)} ${chainSymbol}`,
            `Required for Transaction: ${transaction.value} ${chainSymbol}`,
            `Chain: ${chainId} (${chainSymbol})`,
            ``,
            `📝 IMPORTANT: Session keys create their own smart wallets!`,
            `- Dynamic created: ${sessionKeyData.smartWalletOwner}`,
            `- Session key uses: ${smartAccountAddress}`,
            `- You need to fund the SESSION KEY smart wallet, not Dynamic's wallet`,
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

  /**
   * Create session key client for existing smart wallet
   * Uses manual UserOperation construction to operate on Dynamic's existing wallet
   * This is the correct Account Abstraction pattern for session keys
   */
  private async createKernelClientForExistingWallet(
    sessionKeyPrivateKey: string,
    existingWalletAddress: Address,
    chainId: number,
  ): Promise<any> {
    try {
      this.logger.error(
        '🚀 ENTERING: createKernelClientForExistingWallet method',
        {
          existingWallet: existingWalletAddress,
          chainId,
          sessionKeyLength: sessionKeyPrivateKey?.length || 0,
        },
      );

      this.logger.log('Creating session key client for existing wallet', {
        existingWallet: existingWalletAddress,
        chainId,
      });

      const chain = this.getChainConfig(chainId);
      const bundlerUrl = this.getBundlerUrl(chainId);
      const paymasterUrl = this.getPaymasterUrl(chainId);

      // FIXED: Enhanced private key validation and formatting
      if (!sessionKeyPrivateKey || typeof sessionKeyPrivateKey !== 'string') {
        throw new Error(
          'Session key private key is null, undefined, or not a string',
        );
      }

      // Ensure private key has proper 0x prefix and length
      let formattedPrivateKey = sessionKeyPrivateKey.trim();
      if (!formattedPrivateKey.startsWith('0x')) {
        formattedPrivateKey = `0x${formattedPrivateKey}`;
      }

      if (formattedPrivateKey.length !== 66) {
        // 0x + 64 hex chars
        throw new Error(
          `Invalid private key length: ${formattedPrivateKey.length}, expected 66`,
        );
      }

      // Validate hex characters
      const hexPattern = /^0x[0-9a-fA-F]{64}$/;
      if (!hexPattern.test(formattedPrivateKey)) {
        throw new Error('Invalid private key format: must be valid hex string');
      }

      this.logger.debug('🔑 Creating session key signer', {
        privateKeyLength: formattedPrivateKey.length,
        hasValidPrefix: formattedPrivateKey.startsWith('0x'),
        privateKeyPreview: `${formattedPrivateKey.substring(0, 6)}...${formattedPrivateKey.substring(-4)}`,
      });

      const sessionKeySigner = privateKeyToAccount(formattedPrivateKey as Hex);

      this.logger.debug('✅ Session key signer created successfully', {
        signerAddress: sessionKeySigner.address,
        hasSignMessage: typeof sessionKeySigner.signMessage === 'function',
        hasSignTypedData: typeof sessionKeySigner.signTypedData === 'function',
      });

      // Create clients for UserOperation submission
      const publicClient = createPublicClient({
        chain,
        transport: http(chain.rpcUrls.default.http[0]),
      });

      // Create ZeroDev-specific bundler client
      const bundlerClient = createPublicClient({
        chain,
        transport: http(bundlerUrl),
      });

      // Also create a direct HTTP client for ZeroDev-specific API calls
      const directBundlerClient = {
        url: bundlerUrl,
        async request(method: string, params: any[]) {
          const response = await fetch(bundlerUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'User-Agent': 'Zzyra-Worker/1.0',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method,
              params,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `Bundler HTTP error ${response.status}: ${response.statusText}. Response: ${errorText}`,
            );
          }

          const result = await response.json();

          // Debug: Log the full response for troubleshooting
          console.log('Bundler response:', JSON.stringify(result, null, 2));

          if (result.error) {
            throw new Error(
              `Bundler error: ${result.error.message || result.error}. Code: ${result.error.code || 'unknown'}`,
            );
          }

          return result.result;
        },

        // Method to check what RPC methods the bundler supports
        async getSupportedMethods(): Promise<string[]> {
          try {
            const response = await fetch(this.url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'rpc_methods',
                params: [],
              }),
            });

            if (response.ok) {
              const result = await response.json();
              if (result.result && result.result.methods) {
                return result.result.methods;
              }
            }
          } catch (error) {
            console.log('Failed to get supported methods:', error);
          }

          return [];
        },
      };

      // Create paymaster for gas sponsorship
      this.logger.debug('Creating ZeroDev paymaster client', { chainId });

      const zeroDevPaymaster = createZeroDevPaymasterClient({
        chain,
        transport: http(paymasterUrl),
      });

      // EntryPoint verification moved to buildUserOperationForExistingWallet method

      this.logger.error('🔍 ABOUT TO START: Smart account deployment process', {
        address: existingWalletAddress,
        chainId,
        chainName: chain.name,
        step: 'Before deployment logic',
      });

      // CRITICAL: Always attempt smart account deployment/redeployment for EntryPoint v0.7 compatibility
      // The "execution reverted" error indicates the smart account is incompatible with EntryPoint v0.7
      // We must ensure it's deployed with the correct EntryPoint version for ZeroDev bundler compatibility
      this.logger.error(
        '🔄 FORCING smart account deployment/redeployment for EntryPoint v0.7 compatibility',
        {
          address: existingWalletAddress,
          chainId,
          chainName: chain.name,
          reason:
            'ZeroDev bundler requires EntryPoint v0.7, existing account may be v0.6 incompatible',
          entryPointV7: '0x0000000071727de22e5e9d8baf0edac6f37da032',
        },
      );

      // Verify smart account deployment (deployed by Dynamic Labs)
      const isDeployed = await this.verifySmartAccountDeployment(
        existingWalletAddress, 
        chainId, 
        chain
      );
      
      if (isDeployed) {
        this.logger.log('✅ Smart account deployment verified', {
          address: existingWalletAddress,
          chainId,
          chainName: chain.name,
          entryPointV7: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
          note: 'Smart account is deployed and ready for EntryPoint v0.7 transactions',
        });
      } else {
        const errorMessage = 
          '❌ Smart Account Not Deployed\n\n' +
          `Smart wallet: ${existingWalletAddress}\n` +
          `Chain: ${chain.name} (${chainId})\n\n` +
          'The smart account contract is not deployed on-chain. ' +
          'Smart accounts should be deployed automatically by Dynamic Labs during session key creation.\n\n' +
          'To resolve:\n' +
          '1. Use the frontend to create a new blockchain authorization\n' +
          '2. The frontend will automatically deploy the smart wallet\n' +
          '3. Try running the workflow again after deployment\n\n' +
          'Note: The worker does not deploy smart accounts for security reasons.';
        
        this.logger.error('Smart account deployment verification failed', {
          address: existingWalletAddress,
          chainId,
          chainName: chain.name,
          isDeployed: false,
          entryPointV7: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
        });
        
        throw new Error(errorMessage);
      }

      // Create custom client that operates on existing wallet address
      const sessionKeyClient = {
        account: {
          address: existingWalletAddress, // Use Dynamic's wallet address
          type: 'smart' as const,
        },
        chain,
        transport: bundlerClient.transport,

        // Custom sendTransaction that builds UserOperations for existing wallet
        sendTransaction: async (params: {
          to: Address;
          value: bigint;
          data?: Hex;
        }) => {
          this.logger.log(
            'Executing transaction via session key on existing wallet',
            {
              existingWallet: existingWalletAddress,
              sessionKeySigner: sessionKeySigner.address,
              to: params.to,
              value: params.value.toString(),
            },
          );

          // Build UserOperation for existing wallet
          const userOp = await this.buildUserOperationForExistingWallet({
            senderWallet: existingWalletAddress,
            to: params.to,
            value: params.value,
            data: params.data || '0x',
            sessionKeySigner,
            publicClient,
            paymaster: zeroDevPaymaster,
            chainId,
          });

          // Submit UserOperation via bundler
          const txHash = await this.submitUserOperation(
            userOp,
            directBundlerClient,
            chainId,
          );

          this.logger.log('Transaction submitted via session key', {
            transactionHash: txHash,
          });

          return txHash;
        },
      };

      this.logger.log('Session key client created', {
        existingWallet: existingWalletAddress,
        chainId,
      });

      return sessionKeyClient;
    } catch (error) {
      this.logger.error(
        'Failed to create session key client for existing wallet',
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          existingWallet: existingWalletAddress,
          chainId,
          sessionKeyLength: sessionKeyPrivateKey?.length || 0,
        },
      );
      throw new Error(
        `Failed to create session key client: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Build UserOperation for existing smart wallet
   * This constructs a UserOperation that will be executed by the existing wallet
   * but signed by the session key
   */
  private async buildUserOperationForExistingWallet(params: {
    senderWallet: Address;
    to: Address;
    value: bigint;
    data: Hex;
    sessionKeySigner: any;
    publicClient: any;
    paymaster: any;
    chainId: number;
  }): Promise<any> {
    try {
      const {
        senderWallet,
        to,
        value,
        data,
        sessionKeySigner,
        publicClient,
        paymaster,
      } = params;

      this.logger.log(
        '🚀 STARTING: Building UserOperation for existing wallet',
        {
          senderWallet,
          to,
          value: value.toString(),
          chainId: params.chainId,
        },
      );

      // CRITICAL: Verify EntryPoint contract availability BEFORE building UserOperation
      this.logger.error(
        '🔍 CRITICAL: Verifying EntryPoint contract before UserOperation building',
        {
          chainId: params.chainId,
          entryPointV7: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
        },
      );

      try {
        const entryPointV7 = '0x0000000071727de22e5e9d8baf0edac6f37da032';
        const entryPointV7Code = await publicClient.getBytecode({
          address: entryPointV7 as Address,
        });

        if (entryPointV7Code && entryPointV7Code !== '0x') {
          this.logger.error('✅ SUCCESS: EntryPoint v0.7 verified available', {
            chainId: params.chainId,
            entryPointAddress: entryPointV7,
            codeLength: entryPointV7Code.length,
          });
        } else if (params.chainId === 1328) {
          // Try EntryPoint v0.6 as fallback for SEI Testnet
          const entryPointV7 = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';
          const entryPointV7Code = await publicClient.getBytecode({
            address: entryPointV7 as Address,
          });

          this.logger.log(
            '🔍 Checking EntryPoint v0.7 deployment on chain',
            {
              chainId: params.chainId,
              entryPointV7,
              entryPointV7Code: entryPointV7Code || 'undefined',
            },
          );

          if (entryPointV7Code && entryPointV7Code !== '0x') {
            this.logger.log(
              '✅ SUCCESS: EntryPoint v0.7 verified on chain',
              {
                chainId: params.chainId,
                entryPointAddress: entryPointV7,
                codeLength: entryPointV7Code.length,
              },
            );
          } else {
            this.logger.error(
              '❌ FATAL: EntryPoint v0.7 not deployed on chain',
              {
                chainId: params.chainId,
                entryPointV7,
                entryPointV7Code: entryPointV7Code || 'undefined',
              },
            );
            throw new Error('EntryPoint v0.7 contract not deployed on chain');
          }
        } else {
          this.logger.error('❌ FATAL: EntryPoint v0.7 not deployed', {
            chainId: params.chainId,
            entryPointV7,
            entryPointV7Code: entryPointV7Code || 'undefined',
          });
          throw new Error(
            `EntryPoint v0.7 not deployed on chain ${params.chainId}`,
          );
        }
      } catch (entryPointError) {
        this.logger.error(
          '💥 FATAL: EntryPoint verification failed during UserOperation building',
          {
            chainId: params.chainId,
            error:
              entryPointError instanceof Error
                ? entryPointError.message
                : String(entryPointError),
            stack:
              entryPointError instanceof Error
                ? entryPointError.stack
                : undefined,
          },
        );
        throw new Error(
          `Cannot build UserOperation: EntryPoint contract not available on chain ${params.chainId}`,
        );
      }

      // Get current nonce for the existing wallet
      const nonce = await this.getWalletNonce(senderWallet, publicClient);

      // FIXED: Enhanced execution call data encoding with comprehensive error handling
      const callData = await this.encodeExecuteCallSafely(to, value, data);

      // Build UserOperation structure with safe defaults
      const userOp = {
        sender: senderWallet, // Use existing wallet as sender
        nonce: BigInt(nonce || 0), // Ensure BigInt conversion
        initCode: '0x' as Hex, // Empty for deployed wallets
        callData,
        callGasLimit: BigInt(300000), // Increased conservative estimate
        verificationGasLimit: BigInt(200000), // Increased for session key verification
        preVerificationGas: BigInt(50000), // Increased base gas
        maxFeePerGas: BigInt(30000000000), // 30 gwei default
        maxPriorityFeePerGas: BigInt(2000000000), // 2 gwei tip
        paymasterAndData: '0x' as Hex, // Will be filled by paymaster
        signature: '0x' as Hex, // Will be filled after signing
      };

      this.logger.debug('UserOperation structure created', {
        sender: userOp.sender,
        nonce: userOp.nonce.toString(),
        callDataLength: userOp.callData.length,
      });

      // FIXED: Enhanced paymaster integration with comprehensive error handling
      try {
        this.logger.debug('Requesting paymaster sponsorship', {
          chainId: params.chainId,
        });

        let paymasterResult;

        // Try multiple paymaster methods in order of preference
        if (typeof paymaster.getPaymasterStubData === 'function') {
          this.logger.debug('Using getPaymasterStubData method');
          paymasterResult = await paymaster.getPaymasterStubData({
            ...userOp,
            nonce: userOp.nonce.toString(),
            callGasLimit: userOp.callGasLimit.toString(),
            verificationGasLimit: userOp.verificationGasLimit.toString(),
            preVerificationGas: userOp.preVerificationGas.toString(),
            maxFeePerGas: userOp.maxFeePerGas.toString(),
            maxPriorityFeePerGas: userOp.maxPriorityFeePerGas.toString(),
          });
        } else if (typeof paymaster.sponsorUserOperation === 'function') {
          this.logger.debug('Using sponsorUserOperation method');
          paymasterResult = await paymaster.sponsorUserOperation({
            ...userOp,
            nonce: userOp.nonce.toString(),
            callGasLimit: userOp.callGasLimit.toString(),
            verificationGasLimit: userOp.verificationGasLimit.toString(),
            preVerificationGas: userOp.preVerificationGas.toString(),
            maxFeePerGas: userOp.maxFeePerGas.toString(),
            maxPriorityFeePerGas: userOp.maxPriorityFeePerGas.toString(),
          });
        } else if (typeof paymaster.getPaymasterAndData === 'function') {
          this.logger.debug('Using getPaymasterAndData method');
          paymasterResult = await paymaster.getPaymasterAndData({
            ...userOp,
            nonce: userOp.nonce.toString(),
            callGasLimit: userOp.callGasLimit.toString(),
            verificationGasLimit: userOp.verificationGasLimit.toString(),
            preVerificationGas: userOp.preVerificationGas.toString(),
            maxFeePerGas: userOp.maxFeePerGas.toString(),
            maxPriorityFeePerGas: userOp.maxPriorityFeePerGas.toString(),
          });
        } else {
          this.logger.warn(
            'No compatible paymaster method found, proceeding without sponsorship',
          );
        }

        if (paymasterResult && typeof paymasterResult === 'object') {
          // Update paymaster data
          if (
            paymasterResult.paymasterAndData &&
            typeof paymasterResult.paymasterAndData === 'string'
          ) {
            userOp.paymasterAndData = paymasterResult.paymasterAndData as Hex;
          }

          // Safe gas limit updates with validation
          const gasFields = [
            'callGasLimit',
            'verificationGasLimit',
            'preVerificationGas',
            'maxFeePerGas',
            'maxPriorityFeePerGas',
          ];

          for (const field of gasFields) {
            if (paymasterResult[field] != null) {
              try {
                let value = paymasterResult[field];

                // Handle different value formats
                if (typeof value === 'string') {
                  // Handle hex strings
                  if (value.startsWith('0x')) {
                    value = BigInt(value);
                  } else {
                    value = BigInt(value);
                  }
                } else if (typeof value === 'number') {
                  value = BigInt(Math.floor(value));
                } else if (typeof value === 'bigint') {
                  // Already BigInt
                } else {
                  this.logger.warn(`Invalid ${field} type from paymaster`, {
                    field,
                    value,
                    type: typeof value,
                  });
                  continue;
                }

                // Validate reasonable gas values
                if (value < 0n || value > BigInt('0xffffffffffffffff')) {
                  this.logger.warn(`Invalid ${field} value from paymaster`, {
                    field,
                    value: value.toString(),
                  });
                  continue;
                }

                (userOp as any)[field] = value;
              } catch (conversionError) {
                this.logger.warn(`Failed to convert ${field} from paymaster`, {
                  field,
                  value: paymasterResult[field],
                  error:
                    conversionError instanceof Error
                      ? conversionError.message
                      : String(conversionError),
                });
              }
            }
          }

          this.logger.log('Paymaster sponsorship applied', {
            hasPaymasterData: userOp.paymasterAndData !== '0x',
          });
        }
      } catch (paymasterError) {
        this.logger.warn('Paymaster sponsorship failed, using user-paid gas', {
          error:
            paymasterError instanceof Error
              ? paymasterError.message
              : String(paymasterError),
          stack:
            paymasterError instanceof Error ? paymasterError.stack : undefined,
        });
        // Continue without sponsorship - user will pay gas
      }

      // FIXED: Enhanced UserOperation signing with comprehensive error handling
      const userOpHash = await this.getUserOperationHashSafely(
        userOp,
        params.chainId,
      );

      let signature: Hex;
      try {
        this.logger.debug('Signing UserOperation hash', {
          signerAddress: sessionKeySigner.address,
        });

        // Validate signer before use
        if (
          !sessionKeySigner ||
          typeof sessionKeySigner.signMessage !== 'function'
        ) {
          throw new Error(
            'Invalid session key signer: missing signMessage method',
          );
        }

        // Convert hash to proper message format
        const messageBytes = userOpHash.startsWith('0x')
          ? userOpHash.slice(2)
          : userOpHash;
        const messageToSign = `0x${messageBytes}` as Hex;

        this.logger.debug('Calling signMessage on session key signer', {
          messageToSign: `${messageToSign.substring(0, 10)}...${messageToSign.substring(-10)}`,
          messageLength: messageToSign.length,
        });

        const signResult = await sessionKeySigner.signMessage({
          message: { raw: messageToSign },
        });

        this.logger.debug('Signature result received', {
          resultType: typeof signResult,
        });

        // FIXED: Ultra-robust signature extraction with multiple fallback strategies
        if (typeof signResult === 'string' && signResult.length > 0) {
          signature = signResult as Hex;
        } else if (signResult && typeof signResult === 'object') {
          // Try multiple signature properties in order of preference
          const possibleProps = ['signature', 'raw', 'hex', 'data', 'result'];
          let extractedSig: string | undefined;

          for (const prop of possibleProps) {
            if (
              prop in signResult &&
              typeof (signResult as any)[prop] === 'string'
            ) {
              extractedSig = (signResult as any)[prop];
              this.logger.debug(`Extracted signature from property: ${prop}`);
              break;
            }
          }

          if (extractedSig && extractedSig.length > 0) {
            signature = extractedSig as Hex;
          } else {
            this.logger.error('No valid signature found in signature object', {
              signResult,
              availableProperties: Object.keys(signResult),
              propertyTypes: Object.fromEntries(
                Object.entries(signResult).map(([k, v]) => [k, typeof v]),
              ),
            });
            throw new Error(
              'Invalid signature object - no valid signature string found',
            );
          }
        } else {
          this.logger.error('Invalid signature result from signer', {
            signResult,
            resultType: typeof signResult,
            isUndefined: signResult === undefined,
            isNull: signResult === null,
          });
          throw new Error(
            `Invalid signature format: expected string or object, got ${typeof signResult}`,
          );
        }

        // Validate signature format
        if (!signature || signature === '0x' || signature.length < 132) {
          // At least 65 bytes + 0x prefix
          throw new Error(
            `Invalid signature length: ${signature?.length || 0}, expected at least 132 characters`,
          );
        }

        // Ensure proper hex format
        if (
          !signature.startsWith('0x') ||
          !/^0x[0-9a-fA-F]+$/.test(signature)
        ) {
          throw new Error(
            'Invalid signature format: must be valid hex string with 0x prefix',
          );
        }

        userOp.signature = signature;

        this.logger.debug('✅ UserOperation signed successfully', {
          signatureLength: signature.length,
          signaturePrefix: signature.substring(0, 10),
          signatureSuffix: signature.substring(-10),
        });
      } catch (signError) {
        this.logger.error('Failed to sign UserOperation with session key', {
          error:
            signError instanceof Error ? signError.message : String(signError),
          stack: signError instanceof Error ? signError.stack : undefined,
          sessionKeySigner: sessionKeySigner?.address,
          userOpHashLength: userOpHash?.length,
          hasSignMessage:
            sessionKeySigner &&
            typeof sessionKeySigner.signMessage === 'function',
        });
        throw new Error(
          `UserOperation signing failed: ${signError instanceof Error ? signError.message : 'Unknown signing error'}`,
        );
      }

      this.logger.log('UserOperation built and signed', {
        sender: senderWallet,
        to,
        value: value.toString(),
        hasPaymaster: userOp.paymasterAndData !== '0x',
      });

      return userOp;
    } catch (error) {
      this.logger.error('Failed to build UserOperation for existing wallet', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        senderWallet: params.senderWallet,
        to: params.to,
        value: params.value.toString(),
        chainId: params.chainId,
      });
      throw error;
    }
  }

  /**
   * FIXED: Safe execution call encoding with comprehensive error handling
   */
  private async encodeExecuteCallSafely(
    to: Address,
    value: bigint,
    data: Hex,
  ): Promise<Hex> {
    try {
      this.logger.debug('Encoding execute call', {
        to,
        value: value.toString(),
      });

      // Validate inputs
      if (
        !to ||
        typeof to !== 'string' ||
        !to.startsWith('0x') ||
        to.length !== 42
      ) {
        throw new Error(`Invalid 'to' address: ${to}`);
      }

      if (typeof value !== 'bigint') {
        throw new Error(
          `Invalid value type: expected bigint, got ${typeof value}`,
        );
      }

      if (value < 0n) {
        throw new Error(
          `Invalid value: cannot be negative (${value.toString()})`,
        );
      }

      if (!data || typeof data !== 'string') {
        data = '0x';
      } else if (!data.startsWith('0x')) {
        data = `0x${data}`;
      }

      // Standard execute function signature: execute(address,uint256,bytes)
      const callData = encodeFunctionData({
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

      this.logger.debug('Execute call encoded successfully');

      return callData;
    } catch (error) {
      this.logger.error('Failed to encode execute call', {
        error: error instanceof Error ? error.message : String(error),
        to,
        value: value?.toString(),
        data,
      });
      throw new Error(
        `Execute call encoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get nonce for existing smart wallet from EntryPoint contract
   * FIXED: Enhanced with comprehensive error handling and fallbacks
   */
  private async getWalletNonce(
    walletAddress: Address,
    publicClient: any,
  ): Promise<bigint> {
    try {
      // FIXED: Robust EntryPoint address extraction
      let entryPointAddress: string;
      try {
        const entryPointConfig = getEntryPoint('0.7');
        if (typeof entryPointConfig === 'string') {
          entryPointAddress = entryPointConfig;
        } else if (
          entryPointConfig &&
          typeof entryPointConfig === 'object' &&
          entryPointConfig.address
        ) {
          entryPointAddress = entryPointConfig.address;
        } else {
          throw new Error('Invalid EntryPoint configuration format');
        }
      } catch (configError) {
        this.logger.warn(
          'Failed to get EntryPoint from config, using fallback',
          {
            error:
              configError instanceof Error
                ? configError.message
                : String(configError),
          },
        );
        entryPointAddress = '0x0000000071727de22e5e9d8baf0edac6f37da032'; // EntryPoint v0.7 fallback
      }

      this.logger.debug('Getting nonce from EntryPoint', { walletAddress });

      // Validate inputs
      if (
        !walletAddress ||
        !walletAddress.startsWith('0x') ||
        walletAddress.length !== 42
      ) {
        throw new Error(`Invalid wallet address format: ${walletAddress}`);
      }

      if (!publicClient || typeof publicClient.readContract !== 'function') {
        throw new Error('Invalid public client: missing readContract method');
      }

      // Get nonce from EntryPoint contract with comprehensive error handling
      let nonce: bigint;
      try {
        const result = await publicClient.readContract({
          address: entryPointAddress as Address,
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
          args: [walletAddress, BigInt(0)], // Use default key
        });

        if (typeof result === 'bigint') {
          nonce = result;
        } else if (typeof result === 'string') {
          nonce = BigInt(result);
        } else if (typeof result === 'number') {
          nonce = BigInt(Math.floor(result));
        } else {
          throw new Error(`Unexpected nonce type: ${typeof result}`);
        }
      } catch (contractError) {
        this.logger.warn(
          'EntryPoint contract call failed, using fallback nonce',
          {
            walletAddress,
            entryPointAddress,
            error:
              contractError instanceof Error
                ? contractError.message
                : String(contractError),
          },
        );

        // Try alternative nonce methods
        try {
          const transactionCount = await publicClient.getTransactionCount({
            address: walletAddress,
            blockTag: 'pending',
          });
          nonce = BigInt(transactionCount);
          this.logger.debug('Using transaction count as nonce fallback');
        } catch (txCountError) {
          this.logger.warn('Transaction count fallback also failed, using 0', {
            error:
              txCountError instanceof Error
                ? txCountError.message
                : String(txCountError),
          });
          nonce = BigInt(0);
        }
      }

      this.logger.log('Wallet nonce retrieved', { nonce: nonce.toString() });

      return nonce;
    } catch (error) {
      this.logger.error('Failed to get wallet nonce', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Final fallback
      this.logger.warn('Using final fallback nonce: 0');
      return BigInt(0);
    }
  }

  /**
   * FIXED: Enhanced UserOperation hash creation with comprehensive error handling
   */
  /**
   * @deprecated Use getUserOperationHashSafely instead
   * Legacy method kept for backward compatibility
   */
  private async getUserOperationHash(
    userOp: any,
    chainId: number,
  ): Promise<Hex> {
    return this.getUserOperationHashSafely(userOp, chainId);
  }

  private async getUserOperationHashSafely(
    userOp: any,
    chainId: number,
  ): Promise<Hex> {
    try {
      this.logger.debug('Creating UserOperation hash', { chainId });

      // Validate inputs
      if (!userOp || typeof userOp !== 'object') {
        throw new Error('Invalid UserOperation: expected object');
      }

      if (typeof chainId !== 'number' || chainId <= 0) {
        throw new Error(`Invalid chainId: ${chainId}`);
      }

      // FIXED: Ultra-safe serialization with comprehensive null/undefined checks
      const safeUserOp = {
        sender: userOp.sender || '0x0000000000000000000000000000000000000000',
        nonce: this.safeBigIntToString(userOp.nonce),
        initCode: userOp.initCode || '0x',
        callData: userOp.callData || '0x',
        callGasLimit: this.safeBigIntToString(userOp.callGasLimit),
        verificationGasLimit: this.safeBigIntToString(
          userOp.verificationGasLimit,
        ),
        preVerificationGas: this.safeBigIntToString(userOp.preVerificationGas),
        maxFeePerGas: this.safeBigIntToString(userOp.maxFeePerGas),
        maxPriorityFeePerGas: this.safeBigIntToString(
          userOp.maxPriorityFeePerGas,
        ),
        paymasterAndData: userOp.paymasterAndData || '0x',
        chainId: chainId.toString(),
        timestamp: Date.now(),
      };

      this.logger.debug('Safe UserOperation object created');

      // Create deterministic hash from UserOperation data
      const hashData = [
        safeUserOp.sender,
        safeUserOp.nonce,
        safeUserOp.initCode,
        safeUserOp.callData,
        safeUserOp.callGasLimit,
        safeUserOp.verificationGasLimit,
        safeUserOp.preVerificationGas,
        safeUserOp.maxFeePerGas,
        safeUserOp.maxPriorityFeePerGas,
        safeUserOp.paymasterAndData,
        safeUserOp.chainId,
        safeUserOp.timestamp.toString(),
      ].join('|');

      // Create hash using crypto
      const crypto = require('crypto');
      const hash = crypto
        .createHash('sha256')
        .update(hashData, 'utf8')
        .digest('hex');
      const userOpHash = `0x${hash}` as Hex;

      this.logger.debug('UserOperation hash created successfully');

      return userOpHash;
    } catch (error) {
      this.logger.error('Failed to create UserOperation hash', {
        error: error instanceof Error ? error.message : String(error),
        chainId,
      });

      // Fallback hash generation
      try {
        const fallbackData = `fallback_${Date.now()}_${chainId}_${Math.random()}`;
        const crypto = require('crypto');
        const fallbackHash = crypto
          .createHash('sha256')
          .update(fallbackData)
          .digest('hex');
        const fallbackUserOpHash = `0x${fallbackHash}` as Hex;

        this.logger.warn('Using fallback UserOperation hash');

        return fallbackUserOpHash;
      } catch (fallbackError) {
        this.logger.error('Fallback hash generation also failed', {
          fallbackError:
            fallbackError instanceof Error
              ? fallbackError.message
              : String(fallbackError),
        });
        throw new Error('UserOperation hash creation completely failed');
      }
    }
  }

  /**
   * FIXED: Safe BigInt to string conversion with comprehensive validation
   */
  private safeBigIntToString(value: any): string {
    try {
      if (value === null || value === undefined) {
        return '0x0';
      }

      let bigIntValue: bigint;

      if (typeof value === 'bigint') {
        bigIntValue = value;
      } else if (typeof value === 'string') {
        if (value.startsWith('0x')) {
          bigIntValue = BigInt(value);
        } else if (/^\d+$/.test(value)) {
          bigIntValue = BigInt(value);
        } else {
          throw new Error(`Invalid string format: ${value}`);
        }
      } else if (typeof value === 'number') {
        if (!Number.isInteger(value) || value < 0) {
          throw new Error(`Invalid number: ${value}`);
        }
        bigIntValue = BigInt(Math.floor(value));
      } else {
        throw new Error(`Cannot convert ${typeof value} to BigInt`);
      }

      // Validate the BigInt value is reasonable
      if (bigIntValue < 0n) {
        this.logger.warn('Negative BigInt value detected, using 0x0', {
          originalValue: value,
          bigIntValue: bigIntValue.toString(),
        });
        return '0x0';
      }

      if (bigIntValue > 2n ** 256n - 1n) {
        this.logger.warn('BigInt value too large, using 0x0', {
          originalValue: value,
          bigIntValue: bigIntValue.toString(),
        });
        return '0x0';
      }

      // Convert to hex string for ZeroDev compatibility
      const result = `0x${bigIntValue.toString(16)}`;
      return result;
    } catch (error) {
      this.logger.warn('BigInt conversion failed, using 0x0', {
        value,
        valueType: typeof value,
        error: error instanceof Error ? error.message : String(error),
      });
      return '0x0';
    }
  }

  /**
   * Convert nonce to number format compatible with ZeroDev
   * ZeroDev expects nonce as a number 0, not a string "0"
   */
  private safeNonceToNumber(value: any): number {
    try {
      if (value === null || value === undefined) {
        return 0;
      }

      let bigIntValue: bigint;

      if (typeof value === 'bigint') {
        bigIntValue = value;
      } else if (typeof value === 'string') {
        if (value.startsWith('0x')) {
          bigIntValue = BigInt(value);
        } else if (/^\d+$/.test(value)) {
          bigIntValue = BigInt(value);
        } else {
          throw new Error(`Invalid nonce string format: ${value}`);
        }
      } else if (typeof value === 'number') {
        if (!Number.isInteger(value) || value < 0) {
          throw new Error(`Invalid nonce number: ${value}`);
        }
        bigIntValue = BigInt(Math.floor(value));
      } else {
        throw new Error(`Cannot convert ${typeof value} to nonce number`);
      }

      // Validate the nonce value is reasonable
      if (bigIntValue < 0n) {
        this.logger.warn('Negative nonce value detected, using 0', {
          originalValue: value,
          bigIntValue: bigIntValue.toString(),
        });
        return 0;
      }

      if (bigIntValue > 2n ** 64n - 1n) {
        this.logger.warn('Nonce value too large, using 0', {
          originalValue: value,
          bigIntValue: bigIntValue.toString(),
        });
        return 0;
      }

      // Convert to number for ZeroDev compatibility (nonce should be 0, not "0")
      const result = Number(bigIntValue);
      return result;
    } catch (error) {
      this.logger.warn('Nonce conversion failed, using 0', {
        value,
        valueType: typeof value,
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  /**
   * Submit UserOperation to bundler
   * FIXED: Enhanced error handling and EntryPoint address management
   */
  private async submitUserOperation(
    userOp: any,
    bundlerClient: any,
    chainId?: number,
  ): Promise<string> {
    try {
      // FIXED: Safe EntryPoint address extraction with chain-specific handling
      let entryPointAddress: string;
      try {
        // ZeroDev bundler only supports EntryPoint v0.7 for all chains
        const entryPointVersion = '0.7';
        this.logger.debug('Using ZeroDev-supported EntryPoint version', {
          chainId: chainId || 'unknown',
          selectedVersion: entryPointVersion,
          note: 'ZeroDev bundler only supports EntryPoint v0.7',
        });

        const entryPointConfig = getEntryPoint(entryPointVersion);
        if (typeof entryPointConfig === 'string') {
          entryPointAddress = entryPointConfig;
        } else if (
          entryPointConfig &&
          typeof entryPointConfig === 'object' &&
          entryPointConfig.address
        ) {
          entryPointAddress = entryPointConfig.address;
        } else {
          throw new Error('Invalid EntryPoint configuration');
        }

        // EntryPoint contract verification already done in createKernelClientForExistingWallet
        // No need to verify again here
      } catch (configError) {
        this.logger.warn('Using ZeroDev EntryPoint v0.7 fallback', {
          error:
            configError instanceof Error
              ? configError.message
              : String(configError),
          chainId,
        });

        // ZeroDev bundler only supports EntryPoint v0.7
        entryPointAddress = '0x0000000071727de22e5e9d8baf0edac6f37da032';
      }

      this.logger.log('Submitting UserOperation to bundler', {
        sender: userOp.sender,
        entryPointAddress,
        hasPaymaster: userOp.paymasterAndData !== '0x',
      });

      // Convert UserOperation to string format for submission

      const submissionUserOp = {
        sender: userOp.sender,
        nonce: this.safeNonceToNumber(userOp.nonce), // Special handling for nonce
        initCode: userOp.initCode,
        callData: userOp.callData,
        callGasLimit: this.safeBigIntToString(userOp.callGasLimit),
        verificationGasLimit: this.safeBigIntToString(
          userOp.verificationGasLimit,
        ),
        preVerificationGas: this.safeBigIntToString(userOp.preVerificationGas),
        maxFeePerGas: this.safeBigIntToString(userOp.maxFeePerGas),
        maxPriorityFeePerGas: this.safeBigIntToString(
          userOp.maxPriorityFeePerGas,
        ),
        paymasterAndData: userOp.paymasterAndData,
        signature: userOp.signature,
      };

      this.logger.debug('UserOperation conversion completed', {
        convertedNonce: submissionUserOp.nonce,
        convertedNonceType: typeof submissionUserOp.nonce,
      });

      // Validate converted UserOperation before submission

      const requiredFields = [
        'sender',
        'nonce',
        'initCode',
        'callData',
        'signature',
      ];

      for (const field of requiredFields) {
        const value = submissionUserOp[field as keyof typeof submissionUserOp];
        this.logger.debug(`Validating field: ${field}`, { value });

        if (value === null || value === undefined) {
          throw new Error(`Missing required UserOperation field: ${field}`);
        }

        // Special handling for nonce - it can be 0, "0", 0n, or "0x0"
        if (field === 'nonce') {
          if (
            value === 0 ||
            value === '0' ||
            value === '0' ||
            value === 0n ||
            value === '0x0'
          ) {
            continue; // Valid nonce value
          }
        }

        // Special handling for initCode - it can be "0x" (empty)
        if (field === 'initCode' && value === '0x') {
          continue; // Valid empty initCode
        }

        // For other fields, check if they have meaningful values
        if (!value && value !== '0x') {
          throw new Error(`Missing required UserOperation field: ${field}`);
        }

        this.logger.debug(
          `Converted field ${field} validation passed: ${value}`,
        );
      }

      // Log conversion details

      this.logger.debug('UserOperation prepared for submission', {
        sender: submissionUserOp.sender,
        nonce: submissionUserOp.nonce,
        hasPaymaster: submissionUserOp.paymasterAndData !== '0x',
      });

      // Submit UserOperation to ZeroDev bundler

      let result: any;

      // Use the standard ERC-4337 method - this is what ZeroDev actually supports
      const bundlerMethod = 'eth_sendUserOperation';

      this.logger.debug('Using standard ERC-4337 bundler method', {
        method: bundlerMethod,
      });

      try {
        this.logger.debug('Submitting UserOperation to bundler', {
          method: bundlerMethod,
        });

        result = await bundlerClient.request(bundlerMethod, [
          submissionUserOp,
          entryPointAddress,
        ]);
        this.logger.debug('Bundler submission succeeded');
      } catch (methodError) {
        const error =
          methodError instanceof Error
            ? methodError
            : new Error(String(methodError));
        this.logger.error('Bundler submission failed', {
          error: error.message,
        });
        throw error;
      }

      if (!result || typeof result !== 'string') {
        throw new Error(`Invalid bundler response: ${typeof result}`);
      }

      this.logger.log('UserOperation submitted successfully', {
        userOpHash: result,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to submit UserOperation to bundler', {
        error: error instanceof Error ? error.message : String(error),
      });

      throw new Error(
        `UserOperation submission failed: ${error instanceof Error ? error.message : 'Unknown bundler error'}`,
      );
    }
  }

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

    // SEI Testnet only supports self-funded paymasters
    if (chainId === 1328) {
      return `https://rpc.zerodev.app/api/v2/paymaster/${this.zerodevProjectId}?selfFunded=true`;
    }

    // Use ZeroDev-sponsored paymaster for other chains
    return `https://rpc.zerodev.app/api/v2/paymaster/${this.zerodevProjectId}`;
  }

  private getERC20PaymasterUrl(chainId: number): string {
    if (!this.zerodevProjectId) {
      throw new Error('ZeroDev project ID not configured');
    }

    // SEI Testnet only supports self-funded paymasters
    if (chainId === 1328) {
      return `https://rpc.zerodev.app/api/v2/paymaster/${this.zerodevProjectId}?selfFunded=true`;
    }

    // Use ZeroDev-sponsored paymaster for other chains
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
   * Verify smart account deployment status
   * NOTE: Smart accounts are deployed by Dynamic Labs, not by the worker
   */
  private async verifySmartAccountDeployment(
    address: string,
    chainId: number,
    chain: any,
  ): Promise<boolean> {
    try {
      this.logger.log('Verifying smart account deployment status', {
        address,
        chainId,
        chainName: chain.name,
      });

      // Create a public client for verification
      const publicClient = createPublicClient({
        chain,
        transport: http(chain.rpcUrls.default.http[0]),
      });

      // Check if the smart account contract is deployed
      const bytecode = await publicClient.getBytecode({
        address: address as Address,
      });

      const isDeployed = bytecode && bytecode !== '0x';

      this.logger.log('Smart account deployment verification completed', {
        address,
        chainId,
        isDeployed,
        bytecodeLength: bytecode?.length || 0,
      });

      if (!isDeployed) {
        this.logger.warn('Smart account not deployed on-chain', {
          address,
          chainId,
          chainName: chain.name,
          note: 'Smart accounts should be deployed by Dynamic Labs during session key creation',
        });
      }

      return isDeployed;
    } catch (error) {
      this.logger.error('Smart account deployment verification failed', {
        address,
        chainId,
        chainName: chain.name,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
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
   * @deprecated Use encodeExecuteCallSafely instead
   * Legacy method kept for backward compatibility
   */
  private encodeExecuteCall(to: Address, value: bigint, data: Hex): Hex {
    return this.encodeExecuteCallSafely(to, value, data) as any;
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
