import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createKernelAccountClient,
  createZeroDevPaymasterClient,
} from '@zerodev/sdk';
import { Chain, createPublicClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// EntryPoint v0.7 address (standard across all networks)
const ENTRYPOINT_ADDRESS_V07 = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';

// SEI Network Configuration
const SEI_NETWORK_CONFIG = {
  id: 1328,
  name: 'Sei Network',
  nativeCurrency: {
    decimals: 18,
    name: 'SEI',
    symbol: 'SEI',
  },
  rpcUrls: {
    default: {
      http: ['https://evm-rpc.sei-apis.com'],
    },
  },
  blockExplorers: {
    default: { name: 'Seitrace', url: 'https://seitrace.com' },
  },
} as const;

// SEI Testnet Configuration
const SEI_TESTNET_CONFIG = {
  id: 713715,
  name: 'SEI Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'SEI',
    symbol: 'SEI',
  },
  rpcUrls: {
    default: {
      http: [
        'https://yolo-sparkling-sea.sei-atlantic.quiknode.pro/aa0487f22e4ebd479a97f9736eb3c0fb8a2b8e32',
      ],
    },
  },
  blockExplorers: {
    default: { name: 'SEI Testnet Explorer', url: 'https://seitrace.com' },
  },
  testnet: true,
} as const;

interface ZeroDevConfig {
  projectId: string;
  bundlerUrl: string;
  paymasterUrl: string;
  verifyingPaymaster: string;
  erc20Paymaster: string;
}

interface TransactionRequest {
  to: string;
  value: bigint;
  data: string;
}

interface ChainAbstractionRequest {
  calls: TransactionRequest[];
  outputTokens: {
    chainId: number;
    address: string;
    amount: bigint;
  }[];
  inputTokens?: {
    chainId: number;
    address: string;
  }[];
  gasToken?: 'NATIVE' | 'SPONSORED' | 'USDC' | 'USDT';
}

interface TransactionResult {
  transactionHash: string;
  blockNumber?: number;
  gasUsed?: number;
  status: 'success' | 'failed';
  explorerUrl?: string;
  userOpHash?: string;
}

@Injectable()
export class ZeroDevService {
  private readonly logger = new Logger(ZeroDevService.name);
  private readonly config: ZeroDevConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      projectId:
        this.configService.get<string>('ZERODEV_PROJECT_ID') ||
        '8e6f4057-e935-485f-9b6d-f14696e92654',
      bundlerUrl:
        this.configService.get<string>('ZERODEV_BUNDLER_URL') ||
        'https://rpc.zerodev.app/api/v2/bundler/8e6f4057-e935-485f-9b6d-f14696e92654',
      paymasterUrl:
        this.configService.get<string>('ZERODEV_PAYMASTER_URL') ||
        'https://rpc.zerodev.app/api/v2/paymaster/8e6f4057-e935-485f-9b6d-f14696e92654?selfFunded=true',
      verifyingPaymaster:
        this.configService.get<string>('ZERODEV_VERIFYING_PAYMASTER') ||
        '0x0000000000000000000000000000000000000000',
      erc20Paymaster:
        this.configService.get<string>('ZERODEV_ERC20_PAYMASTER') ||
        '0x0000000000000000000000000000000000000000',
    };
  }

  /**
   * Create a ZeroDev kernel account with multi-chain ECDSA validator
   * Note: In practice, the kernel account is created by Dynamic Labs
   * This method is mainly for reference and testing purposes
   */
  async createKernelAccount(
    ownerPrivateKey: string,
    chainId: number = SEI_NETWORK_CONFIG.id,
  ) {
    this.logger.log(`Kernel account creation referenced for chain: ${chainId}`);

    // In the real implementation, kernel accounts come from Dynamic Labs
    // This is a placeholder that would be replaced with actual Dynamic Labs integration
    const owner = privateKeyToAccount(ownerPrivateKey as `0x${string}`);

    return {
      address: owner.address,
      type: 'kernel-account' as const,
      chainId,
    };
  }

  /**
   * Create a ZeroDev kernel client for regular ERC-4337 operations
   * Note: In practice, the kernel client comes from Dynamic Labs
   */
  async createKernelClient(
    kernelAccount: any,
    chainId: number = SEI_NETWORK_CONFIG.id,
  ) {
    this.logger.log(
      `Creating kernel client for account: ${kernelAccount.address} on chain: ${chainId}`,
    );

    try {
      const chain = this.getNetworkConfig(chainId);

      const publicClient = createPublicClient({
        chain,
        transport: http(),
      });

      const bundlerTransport = http(this.config.bundlerUrl);
      const paymasterClient = createZeroDevPaymasterClient({
        chain,
        transport: http(this.config.paymasterUrl),
      });

      // Create kernel account client with bundler and paymaster
      const kernelClient = createKernelAccountClient({
        account: kernelAccount,
        chain,
        bundlerTransport,
        paymaster: paymasterClient,
      });

      this.logger.log(
        `Kernel client created successfully for account: ${kernelAccount.address}`,
      );
      return kernelClient;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create kernel client: ${errorMessage}`);
      throw new Error(`Failed to create kernel client: ${errorMessage}`);
    }
  }

  /**
   * Create a kernel client optimized for chain abstraction
   * Uses ZeroDev's chain abstraction features for cross-chain operations
   */
  async createChainAbstractionClient(
    kernelAccount: any,
    chainId: number = SEI_NETWORK_CONFIG.id,
  ) {
    this.logger.log(
      `Chain abstraction client referenced for account: ${kernelAccount.address} on chain: ${chainId}`,
    );

    // Chain abstraction features are built into Dynamic Labs kernel clients
    // This leverages ZeroDev's chain abstraction capabilities automatically
    return await this.createKernelClient(kernelAccount, chainId);
  }

  /**
   * Send a user operation using the kernel client (from Dynamic Labs)
   * This is the core method that executes transactions via Account Abstraction
   */
  async sendUserOperation(
    kernelClient: any,
    calls: TransactionRequest[],
    chainId: number = SEI_NETWORK_CONFIG.id,
  ): Promise<TransactionResult> {
    try {
      this.logger.log(
        `Sending user operation with ${calls.length} calls on chain: ${chainId}`,
      );

      // Use the kernel client from Dynamic Labs to send the user operation
      // The client is already configured with paymaster and bundler
      const userOpHash = await kernelClient.sendUserOperation({
        calls,
      });

      this.logger.log(`User operation sent with hash: ${userOpHash}`);

      // Wait for the user operation to be mined
      const receipt = await kernelClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });

      const result: TransactionResult = {
        transactionHash: receipt.receipt.transactionHash,
        blockNumber: Number(receipt.receipt.blockNumber),
        gasUsed: Number(receipt.receipt.gasUsed),
        status: 'success',
        userOpHash,
        explorerUrl: this.getExplorerUrl(
          chainId,
          receipt.receipt.transactionHash,
        ),
      };

      this.logger.log(`User operation completed: ${result.transactionHash}`);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to send user operation: ${errorMessage}`,
        errorStack,
      );
      throw new Error(`Failed to send user operation: ${errorMessage}`);
    }
  }

  /**
   * Send a chain-abstracted transaction using intents
   */
  async sendChainAbstractedTransaction(
    intentClient: any,
    request: ChainAbstractionRequest,
    chainId: number = SEI_NETWORK_CONFIG.id,
  ): Promise<TransactionResult> {
    try {
      this.logger.log(
        `Sending chain-abstracted transaction on chain: ${chainId}`,
      );

      const result = await intentClient.sendUserIntent({
        calls: request.calls,
        inputTokens: request.inputTokens,
        outputTokens: request.outputTokens,
        gasToken: request.gasToken,
      });

      this.logger.log(
        `Chain-abstracted transaction sent with output UI hash: ${result.outputUiHash.uiHash}`,
      );

      // Wait for the intent to be executed on the destination chain
      const receipt = await intentClient.waitForUserIntentExecutionReceipt({
        uiHash: result.outputUiHash.uiHash,
      });

      const transactionResult: TransactionResult = {
        transactionHash: receipt.receipt.transactionHash,
        blockNumber: Number(receipt.receipt.blockNumber),
        gasUsed: Number(receipt.receipt.gasUsed),
        status: 'success',
        explorerUrl: this.getExplorerUrl(
          chainId,
          receipt.receipt.transactionHash,
        ),
      };

      this.logger.log(
        `Chain-abstracted transaction completed: ${transactionResult.transactionHash}`,
      );
      return transactionResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to send chain-abstracted transaction: ${errorMessage}`,
        errorStack,
      );
      throw new Error(
        `Failed to send chain-abstracted transaction: ${errorMessage}`,
      );
    }
  }

  /**
   * Get chain-abstracted balances for an account
   */
  async getChainAbstractedBalances(
    intentClient: any,
    networks: number[] = [SEI_NETWORK_CONFIG.id],
    tokenTickers: string[] = ['USDC', 'WETH', 'SEI'],
  ) {
    try {
      this.logger.log(
        `Getting chain-abstracted balances for networks: ${networks.join(', ')}`,
      );

      const cab = await intentClient.getCAB({
        networks,
        tokenTickers,
      });

      this.logger.log(
        `Retrieved chain-abstracted balances: ${JSON.stringify(cab)}`,
      );
      return cab;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to get chain-abstracted balances: ${errorMessage}`,
        errorStack,
      );
      throw new Error(
        `Failed to get chain-abstracted balances: ${errorMessage}`,
      );
    }
  }

  /**
   * Execute a simple transaction (e.g., sending SEI tokens)
   */
  async executeSimpleTransaction(
    kernelClient: any,
    to: string,
    value: string,
    chainId: number = SEI_NETWORK_CONFIG.id,
  ): Promise<TransactionResult> {
    try {
      this.logger.log(
        `Executing simple transaction to ${to} with value ${value} SEI`,
      );

      const calls = [
        {
          to,
          value: parseEther(value),
          data: '0x',
        },
      ];

      return await this.sendUserOperation(kernelClient, calls, chainId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to execute simple transaction: ${errorMessage}`,
        errorStack,
      );
      throw new Error(`Failed to execute simple transaction: ${errorMessage}`);
    }
  }

  /**
   * Execute a contract interaction (e.g., ERC20 transfer)
   */
  async executeContractInteraction(
    kernelClient: any,
    contractAddress: string,
    data: string,
    value: bigint = BigInt(0),
    chainId: number = SEI_NETWORK_CONFIG.id,
  ): Promise<TransactionResult> {
    try {
      this.logger.log(`Executing contract interaction with ${contractAddress}`);

      const calls = [
        {
          to: contractAddress,
          value,
          data,
        },
      ];

      return await this.sendUserOperation(kernelClient, calls, chainId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to execute contract interaction: ${errorMessage}`,
        errorStack,
      );
      throw new Error(
        `Failed to execute contract interaction: ${errorMessage}`,
      );
    }
  }

  /**
   * Batch multiple transactions into a single user operation
   */
  async executeBatchTransactions(
    kernelClient: any,
    transactions: TransactionRequest[],
    chainId: number = SEI_NETWORK_CONFIG.id,
  ): Promise<TransactionResult> {
    try {
      this.logger.log(`Executing batch of ${transactions.length} transactions`);

      return await this.sendUserOperation(kernelClient, transactions, chainId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to execute batch transactions: ${errorMessage}`,
        errorStack,
      );
      throw new Error(`Failed to execute batch transactions: ${errorMessage}`);
    }
  }

  /**
   * Get the explorer URL for a transaction
   */
  private getExplorerUrl(chainId: number, transactionHash: string): string {
    const chain =
      chainId === SEI_NETWORK_CONFIG.id
        ? SEI_NETWORK_CONFIG
        : SEI_TESTNET_CONFIG;
    return `${chain.blockExplorers.default.url}/tx/${transactionHash}`;
  }

  /**
   * Get the current network configuration
   */
  getNetworkConfig(chainId: number) {
    return chainId === SEI_NETWORK_CONFIG.id
      ? SEI_NETWORK_CONFIG
      : SEI_TESTNET_CONFIG;
  }

  /**
   * Get chain configuration for ZeroDev SDK
   */
  private getChainConfig(chainId: number): Chain {
    const config = this.getNetworkConfig(chainId);
    return {
      id: config.id,
      name: config.name,
      nativeCurrency: config.nativeCurrency,
      rpcUrls: config.rpcUrls,
      blockExplorers: config.blockExplorers,
      testnet: (config as any).testnet !== false,
    } as Chain;
  }

  /**
   * Get the ZeroDev configuration
   */
  getConfig(): ZeroDevConfig {
    return this.config;
  }
}
