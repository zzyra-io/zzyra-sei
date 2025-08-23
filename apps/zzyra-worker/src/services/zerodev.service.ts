import { Injectable, Logger } from '@nestjs/common';
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator';
import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
  KernelAccountClient,
} from '@zerodev/sdk';
import { getEntryPoint, KERNEL_V3_3 } from '@zerodev/sdk/constants';
import {
  Address,
  Chain,
  createPublicClient,
  encodeFunctionData,
  formatEther,
  Hex,
  http,
  parseEther,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia, seiTestnet, sepolia } from 'viem/chains';
import { IAccountAbstractionService } from './blockchain/base/IBlockchainService';
import {
  TransactionRequest as BlockchainTransactionRequest,
  TransactionResult as BlockchainTransactionResult,
  GasEstimate,
} from './blockchain/types/blockchain.types';

// Configuration constants
const KERNEL_VERSION = KERNEL_V3_3;
const PROJECT_ID = process.env.ZERODEV_PROJECT_ID;

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
] as const;

// Configuration interfaces
interface ZeroDevAccountConfig {
  ownerPrivateKey: string;
  chainId: number;
  index?: bigint;
}

interface ZyraSessionKeyConfig {
  ownerPrivateKey: string;
  sessionPrivateKey: string;
  chainId: number;
  permissions: ZyraSessionKeyPermissions;
  validUntil?: Date;
  smartWalletAddress?: string;
}

interface ZyraSessionKeyPermissions {
  operations: ('eth_transfer' | 'erc20_transfer' | 'contract_interaction')[];
  maxAmountPerTx: string;
  maxDailyAmount: string;
  validUntil: Date;
  allowedContracts?: string[];
  recurringSchedule?: {
    type: 'daily' | 'weekly' | 'monthly';
    interval: number;
    maxExecutions?: number;
  };
  gasPayment?: {
    method: 'native' | 'erc20' | 'sponsor';
    erc20Token?: {
      address: string;
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
}

@Injectable()
export class ZeroDevService implements IAccountAbstractionService {
  private readonly logger = new Logger(ZeroDevService.name);
  private readonly zerodevProjectId: string;

  constructor() {
    this.zerodevProjectId = PROJECT_ID;
    if (!this.zerodevProjectId) {
      throw new Error('ZERODEV_PROJECT_ID environment variable is required');
    }
  }

  /**
   * Create a ZeroDev Kernel smart account
   */
  async createSmartAccount(config: ZeroDevAccountConfig): Promise<{
    smartAccountAddress: string;
    ownerAddress: string;
    chainId: number;
    delegationMode: string;
    deploymentRequired: boolean;
    isDeployed?: boolean;
    kernelClient?: any;
  }> {
    const chain = this.getChainConfig(config.chainId);
    const bundlerUrl = this.getBundlerUrl(config.chainId);
    const paymasterUrl = this.getPaymasterUrl(config.chainId);

    const ownerSigner = privateKeyToAccount(config.ownerPrivateKey as Hex);

    const publicClient = createPublicClient({
      chain,
      transport: http(chain.rpcUrls.default.http[0]),
    }) as any;

    const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
      signer: ownerSigner,
      entryPoint: getEntryPoint('0.7'),
      kernelVersion: KERNEL_VERSION,
    });

    const kernelAccount = await createKernelAccount(publicClient, {
      plugins: {
        sudo: ecdsaValidator,
      },
      entryPoint: getEntryPoint('0.7'),
      kernelVersion: KERNEL_VERSION,
      index: config.index || BigInt(0),
    });

    const smartAccountAddress = kernelAccount.address;
    const isDeployed = await this.verifySmartAccountDeployment(
      smartAccountAddress,
      config.chainId,
    );

    const zeroDevPaymaster = createZeroDevPaymasterClient({
      chain,
      transport: http(paymasterUrl),
    });

    const kernelClient = createKernelAccountClient({
      account: kernelAccount,
      chain,
      bundlerTransport: http(bundlerUrl),
      paymaster: zeroDevPaymaster,
    });

    return {
      smartAccountAddress,
      ownerAddress: ownerSigner.address,
      chainId: config.chainId,
      delegationMode: 'owner',
      deploymentRequired: !isDeployed,
      isDeployed,
      kernelClient,
    };
  }

  /**
   * Execute transaction using Zzyra session key with ZeroDev
   */
  async executeWithZyraSessionKey(
    sessionKeyData: any,
    decryptedSessionPrivateKey: string,
    ownerPrivateKey: string,
    transaction: TransactionRequest,
  ): Promise<BlockchainTransactionResult> {
    const chainId = transaction.chainId;

    this.logger.log(
      '🚀 Executing transaction with ZeroDv EntryPoint v0.7 + Zyra session key',
      {
        sessionKeyId: sessionKeyData.id,
        chainId,
        smartWallet: sessionKeyData.smartWalletOwner,
        isSeiTestnet: chainId === 1328,
        hasSerializedParams:
          !!sessionKeyData.smartAccountMetadata?.serializedSessionParams,
      },
    );

    // Validate session key integration with frontend
    this.validateSessionKeyIntegration(sessionKeyData);

    // Debug: Log the actual session key data structure
    this.logger.debug('🔍 DEBUG: Session key data structure', {
      sessionKeyId: sessionKeyData.id,
      hasSmartAccountMetadata: !!sessionKeyData.smartAccountMetadata,
      smartAccountMetadata: sessionKeyData.smartAccountMetadata,
      smartWalletOwner: sessionKeyData.smartWalletOwner,
      chainId,
    });

    // SEI Testnet specific optimizations
    if (chainId === 1328) {
      this.logger.debug('🔧 Applying SEI Testnet optimizations', {
        sessionKeyId: sessionKeyData.id,
        chainName: 'SEI Testnet',
        entryPointVersion: '0.7',
      });
    }

    const sessionKeyClient = await this.createSessionKeyClient(
      sessionKeyData,
      decryptedSessionPrivateKey,
      chainId,
    );

    const smartAccountAddress = sessionKeyData.smartWalletOwner;
    if (!smartAccountAddress) {
      throw new Error('Session key missing smartWalletOwner address');
    }

    // Check balance if transaction has value
    if (transaction.value && transaction.value !== '0') {
      await this.validateBalance(
        smartAccountAddress,
        transaction.value,
        chainId,
      );
    }

    // Let ZeroDev SDK handle nonce management automatically to prevent AA25 errors
    // Manual nonce management can cause conflicts with the bundler's internal state
    this.logger.debug('About to send transaction via ZeroDv', {
      sessionKeyId: sessionKeyData.id,
      to: transaction.to,
      value: transaction.value,
      parsedValue: parseEther(transaction.value).toString(),
      chainId,
      smartWallet: smartAccountAddress,
      hasSessionKeyClient: !!sessionKeyClient,
      clientType: sessionKeyClient?.constructor?.name,
    });

    try {
      const txHash = await sessionKeyClient.sendTransaction({
        to: transaction.to as Address,
        value: parseEther(transaction.value),
        data: (transaction.data as Hex) || '0x',
        // Note: Removed explicit nonce to let ZeroDev SDK manage it internally
      } as any);

      this.logger.log('Transaction hash received from ZeroDv', {
        sessionKeyId: sessionKeyData.id,
        txHash,
        txHashType: typeof txHash,
        txHashLength: txHash?.length || 0,
        isValidHash: txHash && txHash.startsWith('0x') && txHash.length === 66,
      });
      const receipt = await this.waitForTransactionReceipt(
        txHash as `0x${string}`,
        chainId,
      );
      if (!txHash || typeof txHash !== 'string' || !txHash.startsWith('0x')) {
        throw new Error(
          `Invalid transaction hash from ZeroDv: ${JSON.stringify(txHash)}`,
        );
      }

      return {
        hash: receipt.transactionHash,
        success: receipt.status === 'success',
        blockNumber: Number(receipt.blockNumber),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 'success' ? 'success' : 'failed',
        explorerUrl: this.getExplorerUrl(chainId, receipt.transactionHash),
      };
    } catch (error) {
      this.logger.error('Error sending transaction via ZeroDv', {
        sessionKeyId: sessionKeyData.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute ERC20 transfer
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
    const transferData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [toAddress as Address, parseEther(amount)],
    });

    const accountConfig: ZeroDevAccountConfig = {
      ownerPrivateKey: sessionConfig.sessionPrivateKey,
      chainId: sessionConfig.chainId,
    };

    const accountInfo = await this.createSmartAccount(accountConfig);

    const txHash = await accountInfo.kernelClient.sendTransaction({
      to: tokenAddress as Address,
      value: parseEther('0'),
      data: transferData as Hex,
      // Let ZeroDev SDK handle nonce automatically
    } as any);

    const receipt = await this.waitForTransactionReceipt(
      txHash,
      sessionConfig.chainId,
    );

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
  }

  /**
   * Execute regular transaction
   */
  async executeTransaction(
    transaction: BlockchainTransactionRequest,
    walletConfig: { privateKey: string; address: string },
  ): Promise<BlockchainTransactionResult> {
    const config: ZeroDevAccountConfig = {
      ownerPrivateKey: walletConfig.privateKey,
      chainId: transaction.chainId,
    };

    const accountInfo = await this.createSmartAccount(config);

    const txHash = await accountInfo.kernelClient.sendTransaction({
      to: transaction.to as Address,
      value: parseEther(transaction.value),
      data: (transaction.data as Hex) || '0x',
      // Let ZeroDev SDK handle nonce automatically
    } as any);

    const receipt = await this.waitForTransactionReceipt(
      txHash,
      transaction.chainId,
    );

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
  }

  /**
   * Get native token balance
   */
  async getNativeBalance(address: string, chainId: number): Promise<string> {
    const chain = this.getChainConfig(chainId);
    const publicClient = createPublicClient({
      chain,
      transport: http(chain.rpcUrls.default.http[0]),
    });

    const balance = await publicClient.getBalance({
      address: address as Address,
    });

    return balance.toString();
  }

  /**
   * Get ERC20 token balance
   */
  async getTokenBalance(
    tokenAddress: string,
    walletAddress: string,
    chainId: number,
  ): Promise<string> {
    const chain = this.getChainConfig(chainId);
    const publicClient = createPublicClient({
      chain,
      transport: http(chain.rpcUrls.default.http[0]),
    });

    const balance = (await publicClient.readContract({
      address: tokenAddress as Address,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [walletAddress as Address],
    })) as bigint;

    return balance.toString();
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(
    transaction: BlockchainTransactionRequest,
  ): Promise<GasEstimate> {
    const chain = this.getChainConfig(transaction.chainId);
    const publicClient = createPublicClient({
      chain,
      transport: http(chain.rpcUrls.default.http[0]),
    });

    const gasEstimate = await publicClient.estimateGas({
      to: transaction.to as Address,
      value: parseEther(transaction.value),
      data: (transaction.data as Hex) || '0x',
    });

    return {
      callGasLimit: gasEstimate.toString(),
      verificationGasLimit: '100000',
      preVerificationGas: '50000',
      maxFeePerGas: '0',
      maxPriorityFeePerGas: '0',
    };
  }

  /**
   * Get current gas prices for the network
   */
  async getCurrentGasPrices(chainId: number): Promise<{
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
  }> {
    // ZeroDev handles gas pricing automatically
    return {
      maxFeePerGas: '0',
      maxPriorityFeePerGas: '0',
    };
  }

  /**
   * Validate a transaction before execution
   */
  async validateTransaction(
    transaction: BlockchainTransactionRequest,
  ): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    if (!transaction.to || !transaction.to.startsWith('0x')) {
      errors.push('Invalid recipient address');
    }

    if (!transaction.value || parseFloat(transaction.value) < 0) {
      errors.push('Invalid transaction value');
    }

    if (!this.isChainSupported(transaction.chainId)) {
      errors.push(`Unsupported chain ID: ${transaction.chainId}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Health check for the service
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
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get supported chain configurations
   */
  getSupportedChains(): any[] {
    return [
      { chainId: 1328, name: 'SEI Testnet', symbol: 'SEI' },
      { chainId: 11155111, name: 'Sepolia', symbol: 'ETH' },
      { chainId: 8453, name: 'Base', symbol: 'ETH' },
      { chainId: 84532, name: 'Base Sepolia', symbol: 'ETH' },
    ];
  }

  /**
   * Check if a chain is supported by this service
   */
  isChainSupported(chainId: number): boolean {
    return [1328, 11155111, 8453, 84532].includes(chainId);
  }

  /**
   * Execute transaction using session key (Account Abstraction)
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
    transaction: BlockchainTransactionRequest,
  ): Promise<BlockchainTransactionResult> {
    return this.executeERC20Transfer(
      sessionConfig,
      transaction.to,
      transaction.to,
      transaction.value,
    );
  }

  /**
   * Deploy smart wallet if needed
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
      const isDeployed = await this.verifySmartAccountDeployment(
        smartWalletAddress,
        chainId,
      );

      if (isDeployed) {
        return { deployed: true };
      }

      // Create and deploy smart account
      const config: ZeroDevAccountConfig = {
        ownerPrivateKey,
        chainId,
      };

      const accountInfo = await this.createSmartAccount(config);

      return {
        deployed: true,
        deploymentHash: accountInfo.smartAccountAddress,
      };
    } catch (error) {
      return {
        deployed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Private helper methods

  private async createSessionKeyClient(
    sessionKeyData: any,
    decryptedSessionPrivateKey: string,
    chainId: number,
  ): Promise<KernelAccountClient> {
    const existingSmartWalletAddress = sessionKeyData.smartWalletOwner;
    if (!existingSmartWalletAddress) {
      throw new Error('Session key missing smartWalletOwner address');
    }

    this.logger.debug('Creating session key client', {
      sessionKeyId: sessionKeyData.id,
      chainId,
      smartWallet: existingSmartWalletAddress,
      hasMetadata: !!sessionKeyData.smartAccountMetadata,
    });

    const metadata = sessionKeyData.smartAccountMetadata as any;

    // Always prefer ZeroDev v5 SessionKeyProvider when serializedSessionParams is available
    if (metadata?.serializedSessionParams) {
      this.logger.log(
        '🎯 Using ZeroDv v5 SessionKeyProvider (preferred path)',
        {
          sessionKeyId: sessionKeyData.id,
          provider: metadata.provider || 'zerodev_v5',
          hasValidator: metadata.hasValidator,
          hasSerializedParams: true,
        },
      );

      return this.createSessionKeyProviderClient(
        metadata.serializedSessionParams,
        chainId,
      );
    }

    // Fallback only when no serializedSessionParams available
    this.logger.warn(
      '⚠️ No serializedSessionParams available, using fallback',
      {
        sessionKeyId: sessionKeyData.id,
        reason: 'Missing serializedSessionParams from frontend',
        provider: metadata?.provider || 'unknown',
        recommendation: 'Ensure frontend creates session keys with ZeroDv v5',
      },
    );

    return this.createKernelClientForExistingWallet(
      decryptedSessionPrivateKey,
      existingSmartWalletAddress as Address,
      chainId,
    );
  }

  private async createSessionKeyProviderClient(
    serializedSessionParams: string,
    chainId: number,
  ): Promise<KernelAccountClient> {
    try {
      this.logger.debug('Creating SessionKeyProvider from serialized params', {
        chainId,
        paramsLength: serializedSessionParams?.length || 0,
        source: 'frontend_zerodev_v5',
      });

      const chain = this.getChainConfig(chainId);

      let sessionKeyParams;
      try {
        sessionKeyParams = JSON.parse(serializedSessionParams);
        this.logger.debug('🔍 DEBUG: Parsed serializedSessionParams', {
          chainId,
          sessionKeyPrivateKey: sessionKeyParams.sessionKeyPrivateKey
            ? 'present'
            : 'missing',
          smartWalletAddress: sessionKeyParams.smartWalletAddress,
          validatorAddress: sessionKeyParams.validatorAddress,
          hasPermissions: !!sessionKeyParams.permissions,
          permissionsCount: sessionKeyParams.permissions?.length || 0,
          validAfter: sessionKeyParams.validAfter,
          validUntil: sessionKeyParams.validUntil,
        });
      } catch (parseError) {
        throw new Error(
          `Failed to parse serializedSessionParams: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`,
        );
      }

      // Validate required parameters from frontend
      if (
        !sessionKeyParams.sessionKeyPrivateKey ||
        !sessionKeyParams.smartWalletAddress ||
        !sessionKeyParams.validatorAddress
      ) {
        this.logger.error('Invalid serialized session params structure', {
          hasSessionKey: !!sessionKeyParams.sessionKeyPrivateKey,
          hasSmartWallet: !!sessionKeyParams.smartWalletAddress,
          hasValidator: !!sessionKeyParams.validatorAddress,
          availableKeys: Object.keys(sessionKeyParams || {}),
        });

        throw new Error(
          'Invalid serialized session params: missing sessionKeyPrivateKey, smartWalletAddress, or validatorAddress',
        );
      }

      const sessionKeySigner = privateKeyToAccount(
        sessionKeyParams.sessionKeyPrivateKey as Hex,
      );
      const bundlerUrl = this.getBundlerUrl(chainId);
      const paymasterUrl = this.getPaymasterUrl(chainId);

      this.logger.debug('SessionKeyProvider configuration', {
        sessionKeyAddress: sessionKeySigner.address,
        smartWalletAddress: sessionKeyParams.smartWalletAddress,
        validatorAddress: sessionKeyParams.validatorAddress,
        chainId,
        bundlerUrl: bundlerUrl.substring(0, 50) + '...',
        entryPoint: '0.7',
        kernelVersion: 'v2.4',
        approach: 'ecdsa_with_session_key_signer_v0.7',
        note: 'Using EntryPoint v0.7 + Kernel v2.4 (only supported version by ZeroDev)',
      });

      const publicClient = createPublicClient({
        chain,
        transport: http(chain.rpcUrls.default.http[0]),
      }) as any;

      // Use ECDSA validator with session key signer for ZeroDv v5 compatibility
      // The session key validator is already installed on the smart account by the frontend
      // We just need to use the session key signer to sign transactions
      const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
        signer: sessionKeySigner,
        entryPoint: getEntryPoint('0.7'),
        kernelVersion: KERNEL_VERSION,
      });

      const kernelAccount = await createKernelAccount(publicClient, {
        plugins: {
          sudo: ecdsaValidator,
        },
        entryPoint: getEntryPoint('0.7'),
        kernelVersion: KERNEL_VERSION,
        address: sessionKeyParams.smartWalletAddress as Address,
      });

      const zeroDevPaymaster = createZeroDevPaymasterClient({
        chain,
        transport: http(paymasterUrl),
      });

      return createKernelAccountClient({
        account: kernelAccount,
        chain,
        bundlerTransport: http(bundlerUrl),
        paymaster: zeroDevPaymaster as any,
      }) as any;
    } catch (error) {
      this.logger.error('Failed to create SessionKeyProvider client', {
        error: error instanceof Error ? error.message : String(error),
        chainId,
        paramsLength: serializedSessionParams?.length || 0,
      });
      throw new Error(
        `SessionKeyProvider creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async createKernelClientForExistingWallet(
    sessionKeyPrivateKey: string,
    existingWalletAddress: Address,
    chainId: number,
  ): Promise<KernelAccountClient> {
    const chain = this.getChainConfig(chainId);
    const bundlerUrl = this.getBundlerUrl(chainId);
    const paymasterUrl = this.getPaymasterUrl(chainId);

    if (!sessionKeyPrivateKey || typeof sessionKeyPrivateKey !== 'string') {
      throw new Error('Invalid session key private key');
    }

    let formattedPrivateKey = sessionKeyPrivateKey.trim();
    if (!formattedPrivateKey.startsWith('0x')) {
      formattedPrivateKey = `0x${formattedPrivateKey}`;
    }

    if (formattedPrivateKey.length !== 66) {
      throw new Error(
        `Invalid private key length: ${formattedPrivateKey.length}, expected 66`,
      );
    }

    const sessionKeySigner = privateKeyToAccount(formattedPrivateKey as Hex);
    const publicClient = createPublicClient({
      chain,
      transport: http(chain.rpcUrls.default.http[0]),
    }) as any;

    const zeroDevPaymaster = createZeroDevPaymasterClient({
      chain,
      transport: http(paymasterUrl),
    });

    const isDeployed = await this.verifySmartAccountDeployment(
      existingWalletAddress,
      chainId,
    );
    if (!isDeployed) {
      throw new Error(
        `Smart account ${existingWalletAddress} is not deployed on chain ${chainId}`,
      );
    }

    const kernelAccount = await createKernelAccount(publicClient, {
      plugins: {
        sudo: await signerToEcdsaValidator(publicClient, {
          signer: sessionKeySigner,
          entryPoint: getEntryPoint('0.7'),
          kernelVersion: KERNEL_VERSION,
        }),
      },
      entryPoint: getEntryPoint('0.7'),
      kernelVersion: KERNEL_VERSION,
    });

    kernelAccount.address = existingWalletAddress;

    const kernelClient = createKernelAccountClient({
      account: kernelAccount,
      chain,
      bundlerTransport: http(bundlerUrl),
      paymaster: zeroDevPaymaster,
    }) as any;

    return kernelClient;
  }

  private async validateBalance(
    smartAccountAddress: string,
    value: string,
    chainId: number,
  ): Promise<void> {
    const chain = this.getChainConfig(chainId);
    const publicClient = createPublicClient({
      chain,
      transport: http(chain.rpcUrls.default.http[0]),
    });

    const balance = await publicClient.getBalance({
      address: smartAccountAddress as Address,
    });

    const requiredValue = parseEther(value);
    if (balance < requiredValue) {
      const chainSymbol = this.getChainSymbol(chainId);
      throw new Error(
        `Insufficient balance: ${formatEther(balance)} ${chainSymbol}, required: ${value} ${chainSymbol}`,
      );
    }
  }

  private async waitForTransactionReceipt(
    txHash: Hex,
    chainId: number,
  ): Promise<any> {
    const chain = this.getChainConfig(chainId);
    const publicClient = createPublicClient({
      chain,
      transport: http(chain.rpcUrls.default.http[0]),
    });

    return publicClient.waitForTransactionReceipt({
      hash: txHash as `0x${string}`,
      timeout: 60_000,
    });
  }

  private async verifySmartAccountDeployment(
    address: string,
    chainId: number,
  ): Promise<boolean> {
    const chain = this.getChainConfig(chainId);
    const publicClient = createPublicClient({
      chain,
      transport: http(chain.rpcUrls.default.http[0]),
    });

    const code = await publicClient.getCode({
      address: address as Address,
    });

    return code !== undefined && code !== '0x';
  }

  private getChainConfig(chainId: number): Chain {
    const supportedChains = {
      1328: seiTestnet,
      11155111: sepolia,
      8453: base,
      84532: baseSepolia,
    };

    const chain = supportedChains[chainId as keyof typeof supportedChains];
    if (!chain) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    return chain;
  }

  private getBundlerUrl(chainId: number): string {
    return `https://rpc.zerodev.app/api/v2/bundler/${this.zerodevProjectId}?chainId=${chainId}`;
  }

  private getPaymasterUrl(chainId: number): string {
    return `https://rpc.zerodev.app/api/v2/paymaster/${this.zerodevProjectId}${chainId === 1328 ? '?selfFunded=true' : ''}`;
  }

  private getChainSymbol(chainId: number): string {
    const symbols = {
      1328: 'SEI',
      11155111: 'ETH',
      8453: 'ETH',
      84532: 'ETH',
    };
    return symbols[chainId as keyof typeof symbols] || 'ETH';
  }

  private getExplorerUrl(chainId: number, txHash: string): string {
    const explorers = {
      1328: `https://seitrace.com/tx/${txHash}`,
      11155111: `https://sepolia.etherscan.io/tx/${txHash}`,
      8453: `https://basescan.org/tx/${txHash}`,
      84532: `https://sepolia.basescan.org/tx/${txHash}`,
    };
    return (
      explorers[chainId as keyof typeof explorers] ||
      `https://etherscan.io/tx/${txHash}`
    );
  }

  /**
   * Validate session key integration with frontend
   * Ensures proper ZeroDv v5 SessionKeyProvider usage
   */
  private validateSessionKeyIntegration(sessionKeyData: any): void {
    const metadata = sessionKeyData.smartAccountMetadata;

    if (!metadata?.serializedSessionParams) {
      this.logger.warn('🚨 Session key missing serializedSessionParams', {
        sessionKeyId: sessionKeyData.id,
        provider: metadata?.provider,
        hasMetadata: !!metadata,
        recommendation:
          'Frontend should create session keys with ZeroDv v5 SessionKeyProvider',
      });
    } else {
      this.logger.debug(
        '✅ Session key has serializedSessionParams (optimal)',
        {
          sessionKeyId: sessionKeyData.id,
          provider: metadata.provider,
          hasValidator: metadata.hasValidator,
        },
      );
    }
  }
}
