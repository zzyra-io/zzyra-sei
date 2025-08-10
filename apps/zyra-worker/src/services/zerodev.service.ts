import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createKernelAccountClient,
  createZeroDevPaymasterClient,
  createKernelAccount,
} from '@zerodev/sdk';
// Note: Proper validator import needs to be fixed based on available ZeroDv packages
// import { signerToEcdsaValidator } from '@zerodev/multi-chain-ecdsa-validator';
// import { KERNEL_V3_1, getEntryPoint } from '@zerodev/sdk/constants';
import {
  Chain,
  createPublicClient,
  http,
  parseEther,
  encodeFunctionData,
  concat,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// EntryPoint v0.7 address (standard across all networks)
const ENTRYPOINT_ADDRESS_V07 =
  '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as const;

// Define Call interface for viem compatibility
interface Call {
  to: `0x${string}`;
  value?: bigint;
  data?: `0x${string}`;
}

// Canonical SEI EVM Testnet Configuration (1328)
const SEI_TESTNET_CONFIG = {
  id: 1328,
  name: 'SEI Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'SEI',
    symbol: 'SEI',
  },
  rpcUrls: {
    default: {
      http: [process.env.SEI_EVM_RPC_URL || 'https://evm-rpc.sei-apis.com'],
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
  entryPointAddress: string;
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
        'https://rpc.zerodev.app/api/v3/8e6f4057-e935-485f-9b6d-f14696e92654/chain/1328',
      paymasterUrl:
        this.configService.get<string>('ZERODEV_PAYMASTER_URL') ||
        'https://rpc.zerodev.app/api/v3/8e6f4057-e935-485f-9b6d-f14696e92654/chain/1328',
      verifyingPaymaster:
        this.configService.get<string>('ZERODEV_VERIFYING_PAYMASTER') ||
        '0x0000000000000000000000000000000000000000',
      erc20Paymaster:
        this.configService.get<string>('ZERODEV_ERC20_PAYMASTER') ||
        '0x0000000000000000000000000000000000000000',
      entryPointAddress:
        this.configService.get<string>('ZERODEV_ENTRY_POINT_ADDRESS') ||
        '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
    };
  }

  /**
   * IMMEDIATE FIX: Create kernel account with proper deployment handling
   * This bypasses the complex v5+ validator pattern and directly fixes the deployment issue
   */
  async createKernelAccountV5(
    ownerPrivateKey: string,
    chainId: number = SEI_TESTNET_CONFIG.id,
  ) {
    this.logger.log(
      `🚀 IMMEDIATE FIX: Creating kernel account with proper deployment handling for chain: ${chainId}`,
    );

    try {
      const chain = this.getNetworkConfig(chainId);
      const owner = privateKeyToAccount(ownerPrivateKey as `0x${string}`);

      this.logger.log('🔧 Using IMMEDIATE deployment fix approach', {
        ownerAddress: owner.address,
        chainId: chain.id,
      });

      // DIRECT FIX: Create a proper account with deployment methods BEFORE creating client
      const deployableAccount = {
        ...owner,
        // Add the deployment methods that ZeroDv gas estimation needs
        getFactoryArgs: async () => {
          this.logger.warn('🔥 getFactoryArgs CALLED during gas estimation!');
          const result = [
            '0x5de4839a76cf55d0c90e2061ef4386d962E15ae3' as `0x${string}`, // Factory address
            this.getKernelV3DeployData(owner.address), // Factory data
          ];
          this.logger.warn('🔥 getFactoryArgs returning:', result);
          return result;
        },
        getInitCode: async () => {
          this.logger.warn('🔥 getInitCode CALLED during gas estimation!');
          const factory = '0x5de4839a76cf55d0c90e2061ef4386d962E15ae3';
          const factoryData = this.getKernelV3DeployData(owner.address);
          const initCode = `${factory}${factoryData.slice(2)}` as `0x${string}`;
          this.logger.warn(
            '🔥 getInitCode returning:',
            initCode.substring(0, 50) + '...',
          );
          return initCode;
        },
        getNonce: async () => {
          this.logger.warn('🔥 getNonce CALLED during gas estimation!');
          return 0n;
        },
        signUserOperation: async (userOp: any) => {
          this.logger.warn('🔥 signUserOperation CALLED!');
          // For now, return a stub signature - in production this would use the owner's private key
          return '0x' + '00'.repeat(65); // 65-byte signature (r, s, v)
        },
      };

      this.logger.log('🏭 Created deployable account with factory methods', {
        hasGetFactoryArgs: typeof deployableAccount.getFactoryArgs,
        hasGetInitCode: typeof deployableAccount.getInitCode,
        hasGetNonce: typeof deployableAccount.getNonce,
      });

      // Create kernel client with the deployable account
      const kernelClient = await createKernelAccountClient({
        account: deployableAccount as any, // Type assertion for compatibility
        chain,
        bundlerTransport: http(this.config.bundlerUrl),
        paymaster: createZeroDevPaymasterClient({
          chain,
          transport: http(this.config.paymasterUrl),
        }),
      });

      this.logger.log(
        '✅ IMMEDIATE FIX: Kernel client created with deployment factory',
        {
          address: kernelClient.account.address,
          hasDeployFactory: true,
          hasSendUserOperation: typeof kernelClient.sendUserOperation,
        },
      );

      return kernelClient;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ IMMEDIATE FIX failed: ${errorMessage}`);
      throw new Error(`Immediate deployment fix failed: ${errorMessage}`);
    }
  }

  /**
   * Generate proper Kernel v3.0 deployment data for factory
   */
  private getKernelV3DeployData(ownerAddress: string): `0x${string}` {
    try {
      // Kernel v3.0 createAccount function selector: 0x5fbfb9cf
      // Parameters: owner (address), salt (uint256)
      const functionSelector = '0x5fbfb9cf';
      const paddedOwner = ownerAddress
        .toLowerCase()
        .replace('0x', '')
        .padStart(64, '0');
      const salt =
        '0000000000000000000000000000000000000000000000000000000000000000'; // Zero salt

      const deployData =
        `${functionSelector}${paddedOwner}${salt}` as `0x${string}`;

      this.logger.log('🏭 Generated Kernel v3.0 deployment data', {
        owner: ownerAddress,
        deployData: deployData.substring(0, 50) + '...',
        length: deployData.length,
      });

      return deployData;
    } catch (error) {
      this.logger.error('Failed to generate deployment data:', error);
      throw new Error('Failed to generate Kernel v3.0 deployment data');
    }
  }

  /**
   * PRODUCTION: Create kernel account for smart wallet delegation
   * Supports the proper delegation hierarchy: EOA → Smart Wallet → Session Key
   * @param ownerPrivateKey - Private key (EOA for immediate execution, session key for delegated)
   * @param chainId - Chain ID to create account on
   * @param delegationMode - Execution mode: 'immediate' (EOA), 'delegated' (session key), 'hybrid' (both)
   * @param smartWalletAddress - For delegated mode, the smart wallet that owns the session key
   */
  async createKernelAccount(
    ownerPrivateKey: string,
    chainId: number = SEI_TESTNET_CONFIG.id,
    delegationMode: 'immediate' | 'delegated' | 'hybrid' = 'immediate',
    smartWalletAddress?: string,
  ) {
    this.logger.log(`🚀 Creating kernel account for chain: ${chainId} (mode: ${delegationMode})`);

    try {
      const chain = this.getNetworkConfig(chainId);

      // Create the owner account from private key
      const owner = privateKeyToAccount(ownerPrivateKey as `0x${string}`);

      this.logger.log('Creating kernel account with proper delegation hierarchy', {
        ownerAddress: owner.address,
        chainId: chain.id,
        chainName: chain.name,
        delegationMode,
        smartWalletAddress,
        bundlerUrl: this.config.bundlerUrl,
        paymasterUrl: this.config.paymasterUrl,
      });

      // Handle different delegation modes
      switch (delegationMode) {
        case 'immediate':
          // EOA directly controls the smart wallet (Dynamic Labs pattern)
          return await this.createImmediateExecutionAccount(owner, chain);
        
        case 'delegated':
          // Session key is owned by an existing smart wallet (delegated execution)
          if (!smartWalletAddress) {
            throw new Error('smartWalletAddress is required for delegated execution mode');
          }
          return await this.createDelegatedExecutionAccount(owner, chain, smartWalletAddress);
        
        case 'hybrid':
          // Support both immediate and delegated execution patterns
          return await this.createHybridExecutionAccount(owner, chain, smartWalletAddress);
        
        default:
          throw new Error(`Invalid delegation mode: ${delegationMode}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to create kernel account: ${errorMessage}`,
        errorStack,
      );
      throw new Error(`Failed to create kernel account: ${errorMessage}`);
    }
  }

  /**
   * Create kernel account for immediate execution (EOA → Smart Wallet)
   * This is the standard Dynamic Labs pattern
   */
  private async createImmediateExecutionAccount(owner: any, chain: any) {
    this.logger.log('Creating immediate execution account (EOA → Smart Wallet)', {
      ownerAddress: owner.address,
    });

    // Create kernel client for immediate execution by EOA
    const kernelClient = await this.createStandardKernelClient(owner, chain);
    
    this.logger.log('Immediate execution account created', {
      smartWalletAddress: kernelClient.account.address,
      ownerAddress: owner.address,
    });

    return kernelClient;
  }

  /**
   * Create kernel account for delegated execution (Session Key → Smart Wallet)
   * Session key operates on behalf of an existing smart wallet
   */
  private async createDelegatedExecutionAccount(
    sessionKeyAccount: any, 
    chain: any, 
    smartWalletAddress: string
  ) {
    this.logger.log('Creating delegated execution account (Session Key → Smart Wallet)', {
      sessionKeyAddress: sessionKeyAccount.address,
      smartWalletAddress,
    });

    // For delegated execution, the session key account acts as the signer
    // but the smart wallet is the actual account that executes transactions
    const kernelClient = await this.createDelegatedKernelClient(
      sessionKeyAccount, 
      chain, 
      smartWalletAddress
    );
    
    this.logger.log('Delegated execution account created', {
      smartWalletAddress: kernelClient.account.address,
      sessionKeyAddress: sessionKeyAccount.address,
      isDelegatedExecution: true,
    });

    return kernelClient;
  }

  /**
   * Create kernel account for hybrid execution
   * Supports both immediate and delegated patterns
   */
  private async createHybridExecutionAccount(
    owner: any, 
    chain: any, 
    smartWalletAddress?: string
  ) {
    this.logger.log('Creating hybrid execution account', {
      ownerAddress: owner.address,
      smartWalletAddress,
    });

    // Start with immediate execution pattern
    const kernelClient = await this.createStandardKernelClient(owner, chain);
    
    // Add delegation support if smart wallet address is provided
    if (smartWalletAddress) {
      this.addDelegationSupport(kernelClient, smartWalletAddress);
    }
    
    this.logger.log('Hybrid execution account created', {
      smartWalletAddress: kernelClient.account.address,
      ownerAddress: owner.address,
      supportsDelegation: !!smartWalletAddress,
    });

    return kernelClient;
  }

  /**
   * Create standard kernel client (original implementation)
   */
  private async createStandardKernelClient(owner: any, chain: any) {

    // Create a real kernel account using ZeroDev SDK
    // This creates a kernel account compatible with Dynamic Labs

    // First, create a proxy owner account with all required compatibility methods
    // This prevents various "method is not a function" errors during kernel client creation
    // IMPORTANT: Provide proper deployment info during creation, not after
    const factoryArgsProvider = this.createGetFactoryArgs(owner.address);
    const initCodeProvider = this.createGetInitCode(owner.address);
    const proxyOwner = {
      ...owner,
      getFactoryArgs: factoryArgsProvider,
      getInitCode: initCodeProvider, // ERC-4337 initCode for deployment
      getNonce: this.createGetNonce(),
      getStubSignature: this.createGetStubSignature(),
    };

    this.logger.warn('🔍 Creating kernel client with proxy owner', {
      ownerAddress: owner.address,
      hasGetFactoryArgs: typeof proxyOwner.getFactoryArgs,
      hasGetNonce: typeof proxyOwner.getNonce,
      hasGetStubSignature: typeof proxyOwner.getStubSignature,
    });

    // Test factory args and initCode before creating client
    try {
      this.logger.warn(
        '🧪 Testing factory args before kernel client creation',
      );
      const testArgs = await proxyOwner.getFactoryArgs();
      this.logger.warn('🧪 Factory args test before client creation:', {
        factory: testArgs[0],
        factoryData: testArgs[1]?.substring(0, 50) + '...',
        hasValidFactory: testArgs[0] !== '0x',
        hasValidFactoryData: testArgs[1] !== '0x',
      });

      this.logger.warn('🧪 Testing initCode before kernel client creation');
      const testInitCode = await proxyOwner.getInitCode();
      this.logger.warn('🧪 InitCode test before client creation:', {
        initCode: testInitCode?.substring(0, 50) + '...',
        initCodeLength: testInitCode?.length,
        hasValidInitCode: testInitCode !== '0x',
      });
    } catch (error) {
      this.logger.error(
        '❌ Error testing deployment methods before client creation:',
        error,
      );
    }

    let kernelClient;
    try {
      // Get factory args to provide directly to kernel client
      const [factoryAddress, factoryData] = await proxyOwner.getFactoryArgs();

      this.logger.warn(
        '🏭 Providing factory deployment info directly to kernel client',
        {
          factoryAddress,
          factoryData: factoryData?.substring(0, 50) + '...',
          ownerAddress: owner.address,
        },
      );

      kernelClient = await createKernelAccountClient({
        account: proxyOwner as any, // Type assertion to bypass strict typing for compatibility
        chain,
        bundlerTransport: http(this.config.bundlerUrl),
        paymaster: createZeroDevPaymasterClient({
          chain,
          transport: http(this.config.paymasterUrl),
        }),
        // Provide factory deployment information directly
        ...(factoryAddress !== '0x' &&
          factoryData !== '0x' && {
            deployFactory: factoryAddress as `0x${string}`,
            deployFactoryData: factoryData,
          }),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to create kernel client with proxy owner', {
        error: errorMessage,
        ownerAddress: owner.address,
        chainId: chain.id,
      });
      throw new Error(`Failed to create kernel client: ${errorMessage}`);
    }

    this.logger.log('Kernel client created, analyzing structure', {
      hasKernelClient: !!kernelClient,
      kernelClientType: typeof kernelClient,
      kernelClientKeys: kernelClient ? Object.keys(kernelClient) : [],
      hasAccount: !!kernelClient?.account,
      accountType: typeof kernelClient?.account,
      accountKeys: kernelClient?.account
        ? Object.keys(kernelClient.account)
        : [],
      hasEncodeCalls: typeof kernelClient?.account?.encodeCalls,
      hasSendUserOperation: typeof kernelClient?.sendUserOperation,
      hasWaitForUserOperationReceipt:
        typeof kernelClient?.waitForUserOperationReceipt,
    });

    // Validate the kernel client structure
    if (!kernelClient || !kernelClient.account) {
      throw new Error(
        'Failed to create kernel client: invalid structure returned',
      );
    }

    // Validate essential methods for ZeroDv v5+
    if (typeof kernelClient.sendUserOperation !== 'function') {
      throw new Error('Kernel client does not have sendUserOperation method');
    }

    if (typeof kernelClient.waitForUserOperationReceipt !== 'function') {
      throw new Error(
        'Kernel client does not have waitForUserOperationReceipt method',
      );
    }

    this.logger.log(
      `Standard kernel account created successfully: ${kernelClient.account.address}`,
    );

    // Ensure all compatibility methods and properties are present
    this.ensureAccountCompatibility(kernelClient, owner.address);

    // Return the kernel client directly since it contains the account with encodeCalls method
    return kernelClient;
  }

  /**
   * Create kernel client for delegated execution
   * Session key acts as signer for an existing smart wallet
   * FIXED: Don't deploy a new wallet, use the existing smart wallet with session key signing
   */
  private async createDelegatedKernelClient(
    sessionKeyAccount: any,
    chain: any,
    smartWalletAddress: string
  ) {
    this.logger.log('Creating delegated kernel client', {
      sessionKeyAddress: sessionKeyAccount.address,
      smartWalletAddress,
    });

    // IMPORTANT: For delegated execution, the smart wallet should already exist
    // We don't deploy a new wallet, we just create a client that uses the session key
    // to sign transactions on behalf of the existing smart wallet

    // Check if smart wallet is deployed
    const isDeployed = await this.isSmartAccountDeployed(smartWalletAddress, chain.id);
    
    if (!isDeployed) {
      throw new Error(`Smart wallet ${smartWalletAddress} is not deployed. For delegated execution, the smart wallet must already exist.`);
    }

    this.logger.log('Smart wallet is deployed, creating delegated client', {
      smartWalletAddress,
      sessionKeyAddress: sessionKeyAccount.address,
    });

    // Create a kernel client that uses the existing smart wallet
    // The session key signs transactions, but the smart wallet executes them
    const delegatedClient = await createKernelAccountClient({
      account: {
        ...sessionKeyAccount,
        // Override address to point to the smart wallet
        address: smartWalletAddress as `0x${string}`,
        // Keep the session key as the signer
        delegatedSigner: sessionKeyAccount.address,
        isDelegated: true,
        // For existing smart wallets, no factory deployment is needed
        getFactoryArgs: async () => ['0x' as `0x${string}`, '0x' as `0x${string}`] as const,
        getInitCode: async () => '0x' as `0x${string}`,
        // Use the smart wallet's nonce, not the session key's nonce
        getNonce: this.createGetNonce(smartWalletAddress, chain.id),
      } as any,
      chain,
      bundlerTransport: http(this.config.bundlerUrl),
      paymaster: createZeroDevPaymasterClient({
        chain,
        transport: http(this.config.paymasterUrl),
      }),
    });

    // Add delegation validation
    this.addDelegationValidation(delegatedClient, sessionKeyAccount.address, smartWalletAddress);

    this.logger.log('Delegated kernel client created successfully', {
      smartWalletAddress: delegatedClient.account.address,
      sessionKeyAddress: sessionKeyAccount.address,
      isDelegated: delegatedClient.account.isDelegated,
    });

    return delegatedClient;
  }

  /**
   * Add delegation support to an existing kernel client
   */
  private addDelegationSupport(kernelClient: any, smartWalletAddress: string) {
    this.logger.log('Adding delegation support to kernel client', {
      currentAddress: kernelClient.account.address,
      smartWalletAddress,
    });

    // Add delegation properties and methods
    kernelClient.account.supportsDelegation = true;
    kernelClient.account.delegatedSmartWallet = smartWalletAddress;

    // Add method to switch between immediate and delegated execution
    kernelClient.switchExecutionMode = (mode: 'immediate' | 'delegated') => {
      if (mode === 'delegated' && smartWalletAddress) {
        kernelClient.account.targetAddress = smartWalletAddress;
        kernelClient.account.executionMode = 'delegated';
      } else {
        kernelClient.account.targetAddress = kernelClient.account.address;
        kernelClient.account.executionMode = 'immediate';
      }
    };

    this.logger.log('Delegation support added', {
      supportsDelegation: kernelClient.account.supportsDelegation,
      delegatedSmartWallet: kernelClient.account.delegatedSmartWallet,
    });
  }

  /**
   * Add delegation validation to a kernel client
   */
  private addDelegationValidation(
    kernelClient: any,
    sessionKeyAddress: string,
    smartWalletAddress: string
  ) {
    this.logger.log('Adding delegation validation', {
      sessionKeyAddress,
      smartWalletAddress,
    });

    // Add validation method to check if session key is authorized
    kernelClient.validateDelegation = async () => {
      // TODO: Implement actual delegation validation
      // This should check that the session key is properly authorized
      // to operate on behalf of the smart wallet
      this.logger.log('Validating delegation authorization', {
        sessionKeyAddress,
        smartWalletAddress,
      });
      
      // For now, assume valid if both addresses exist
      const isValid = !!(sessionKeyAddress && smartWalletAddress);
      
      this.logger.log('Delegation validation result', {
        isValid,
        sessionKeyAddress,
        smartWalletAddress,
      });
      
      return isValid;
    };

    // Override the signing process to use session key for delegated operations
    const originalSendUserOperation = kernelClient.sendUserOperation;
    kernelClient.sendUserOperation = async (userOp: any) => {
      // Validate delegation before sending
      const isValidDelegation = await kernelClient.validateDelegation();
      if (!isValidDelegation) {
        throw new Error(`Invalid delegation: session key ${sessionKeyAddress} not authorized for smart wallet ${smartWalletAddress}`);
      }

      this.logger.log('Sending delegated user operation', {
        sessionKeyAddress,
        smartWalletAddress,
        userOp: typeof userOp,
      });

      // Call original method
      return originalSendUserOperation.call(kernelClient, userOp);
    };

    this.logger.log('Delegation validation added to kernel client');
  }

  /**
   * Create a ZeroDev kernel client for regular ERC-4337 operations
   * Note: This method is now simplified since createKernelAccount returns the client directly
   */
  async createKernelClient(
    kernelAccount: any,
    chainId: number = SEI_TESTNET_CONFIG.id,
  ) {
    this.logger.log(
      `Creating kernel client for account: ${kernelAccount.account?.address || kernelAccount.address} on chain: ${chainId}`,
    );

    try {
      // If kernelAccount is already a kernel client, return it (but add missing methods)
      if (
        kernelAccount.account &&
        typeof kernelAccount.sendUserOperation === 'function' &&
        typeof kernelAccount.waitForUserOperationReceipt === 'function'
      ) {
        // Ensure all compatibility methods and properties are present
        this.ensureAccountCompatibility(kernelAccount);

        this.logger.log(
          `Kernel client already available for account: ${kernelAccount.account?.address || kernelAccount.address}`,
        );
        return kernelAccount;
      }

      // If kernelAccount is just an account object, create a client
      const chain = this.getNetworkConfig(chainId);

      const bundlerTransport = http(this.config.bundlerUrl);
      const paymasterClient = createZeroDevPaymasterClient({
        chain,
        transport: http(this.config.paymasterUrl),
      });

      // Create kernel account client with bundler and paymaster
      // Use standard pattern for Dynamic Labs compatibility
      const kernelClient = createKernelAccountClient({
        account: kernelAccount,
        chain,
        bundlerTransport,
        paymaster: paymasterClient,
      });

      // Ensure all compatibility methods and properties are present
      this.ensureAccountCompatibility(kernelClient);

      this.logger.log(
        `Kernel client created successfully for account: ${kernelClient.account.address}`,
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
    chainId: number = SEI_TESTNET_CONFIG.id,
  ) {
    this.logger.log(
      `Chain abstraction client referenced for account: ${kernelAccount.account?.address || kernelAccount.address} on chain: ${chainId}`,
    );

    // Chain abstraction features are built into Dynamic Labs kernel clients
    // This leverages ZeroDev's chain abstraction capabilities automatically
    // If kernelAccount is already a kernel client, return it (but add missing methods)
    if (
      kernelAccount.account &&
      typeof kernelAccount.sendUserOperation === 'function' &&
      typeof kernelAccount.waitForUserOperationReceipt === 'function'
    ) {
      // Ensure all compatibility methods and properties are present
      this.ensureAccountCompatibility(kernelAccount);
      return kernelAccount;
    }

    // Otherwise, create a new kernel client
    return await this.createKernelClient(kernelAccount, chainId);
  }

  /**
   * Send a user operation using the kernel client (from Dynamic Labs)
   * This is the core method that executes transactions via Account Abstraction
   * Updated for ZeroDev SDK v5+ which accepts calls directly
   */
  async sendUserOperation(
    kernelClient: any,
    calls: TransactionRequest[],
    chainId: number = SEI_TESTNET_CONFIG.id,
  ): Promise<TransactionResult> {
    try {
      this.logger.log(
        `Sending user operation with ${calls.length} calls on chain: ${chainId}`,
      );

      // Validate kernel client structure
      if (!kernelClient) {
        throw new Error('Kernel client is required');
      }

      if (typeof kernelClient.sendUserOperation !== 'function') {
        throw new Error('Kernel client does not have sendUserOperation method');
      }

      if (typeof kernelClient.waitForUserOperationReceipt !== 'function') {
        throw new Error(
          'Kernel client does not have waitForUserOperationReceipt method',
        );
      }

      // Ensure all compatibility methods are present before sending
      // Extract owner address for factory args if needed
      const ownerAddress =
        kernelClient.account?.owner?.address || kernelClient.account?.address;
      this.ensureAccountCompatibility(kernelClient, ownerAddress);

      // Check if smart account is deployed
      const smartAccountAddress = kernelClient.account.address;
      const isDeployed = await this.isSmartAccountDeployed(
        smartAccountAddress,
        chainId,
      );

      this.logger.log('Smart account deployment status', {
        smartAccountAddress,
        isDeployed,
        ownerAddress,
      });

      // If the smart account is not deployed, ensure factory args are properly set
      if (!isDeployed) {
        this.logger.log(
          'Smart account not deployed, ensuring factory deployment info is available',
        );

        // Force re-add factory args with proper owner address
        if (ownerAddress) {
          kernelClient.account.getFactoryArgs =
            this.createGetFactoryArgs(ownerAddress);
          this.logger.log('Updated factory args for undeployed smart account', {
            ownerAddress,
            smartAccountAddress,
          });
        } else {
          this.logger.warn(
            'No owner address available for factory args generation',
          );
        }
      }

      // Test our deployment methods directly before sending
      let testFactoryArgs: readonly [`0x${string}`, `0x${string}`] = [
        '0x',
        '0x',
      ];
      let testInitCode: `0x${string}` = '0x';

      try {
        if (kernelClient?.account?.getFactoryArgs) {
          this.logger.warn(
            '🧪 Testing getFactoryArgs method before sending user operation',
          );
          testFactoryArgs = await kernelClient.account.getFactoryArgs();
          this.logger.warn('🧪 Factory args test result:', {
            factory: testFactoryArgs[0],
            factoryData: testFactoryArgs[1]?.substring(0, 50) + '...',
            hasValidFactory: testFactoryArgs[0] !== '0x',
            hasValidFactoryData: testFactoryArgs[1] !== '0x',
          });
        } else {
          this.logger.error('❌ No getFactoryArgs method found on account!');
        }

        if (kernelClient?.account?.getInitCode) {
          this.logger.warn(
            '🧪 Testing getInitCode method before sending user operation',
          );
          testInitCode = await kernelClient.account.getInitCode();
          this.logger.warn('🧪 InitCode test result:', {
            initCode: testInitCode?.substring(0, 50) + '...',
            initCodeLength: testInitCode?.length,
            hasValidInitCode: testInitCode !== '0x',
          });
        } else {
          this.logger.error('❌ No getInitCode method found on account!');
        }
      } catch (error) {
        this.logger.error('❌ Error testing deployment methods:', error);
      }

      this.logger.log('Kernel client validated, sending user operation', {
        hasKernelClient: !!kernelClient,
        kernelClientType: typeof kernelClient,
        hasSendUserOperation: typeof kernelClient?.sendUserOperation,
        hasWaitForUserOperationReceipt:
          typeof kernelClient?.waitForUserOperationReceipt,
        callsCount: calls.length,
        firstCall: calls[0],
        hasEncodeCalls: typeof kernelClient?.account?.encodeCalls,
        hasGetFactoryArgs: typeof kernelClient?.account?.getFactoryArgs,
        hasGetNonce: typeof kernelClient?.account?.getNonce,
        hasEntryPoint: !!kernelClient?.account?.entryPoint,
        accountKeys: kernelClient?.account
          ? Object.keys(kernelClient.account)
          : [],
        testFactoryArgs: {
          factory: testFactoryArgs[0],
          factoryData: testFactoryArgs[1]?.substring(0, 50) + '...',
        },
        testInitCode: {
          initCode: testInitCode?.substring(0, 50) + '...',
          initCodeLength: testInitCode?.length,
        },
      });

      // Use the correct ZeroDev v5 pattern: encode calls first, then send with callData
      // This matches the frontend pattern and avoids viem factory deployment issues
      let callData;
      try {
        callData = await kernelClient.account.encodeCalls(
          calls.map((call) => ({
            to: call.to as `0x${string}`,
            value: call.value,
            data: call.data as `0x${string}`,
          })),
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error('Failed to encode calls', {
          error: errorMessage,
          callsCount: calls.length,
          accountKeys: Object.keys(kernelClient.account || {}),
        });
        throw new Error(`Failed to encode calls: ${errorMessage}`);
      }

      let userOpHash;
      try {
        // 🔥 DEBUG: Check if account still has deployment methods before sending
        this.logger.warn(
          '🔥 About to send user operation - checking account deployment methods...',
        );
        this.logger.warn(
          '🔥 Account keys:',
          Object.keys(kernelClient.account || {}),
        );

        // Test if deployment methods can be called
        if (kernelClient.account?.getFactoryArgs) {
          try {
            const factoryArgs = await kernelClient.account.getFactoryArgs();
            this.logger.warn(
              '🔥 Manual getFactoryArgs test successful:',
              factoryArgs,
            );
          } catch (err) {
            this.logger.warn('🔥 Manual getFactoryArgs test FAILED:', err);
          }
        } else {
          this.logger.warn('🔥 ❌ NO getFactoryArgs method found on account!');
        }

        if (kernelClient.account?.getInitCode) {
          try {
            const initCode = await kernelClient.account.getInitCode();
            this.logger.warn(
              '🔥 Manual getInitCode test successful:',
              initCode?.substring(0, 50) + '...',
            );
          } catch (err) {
            this.logger.warn('🔥 Manual getInitCode test FAILED:', err);
          }
        } else {
          this.logger.warn('🔥 ❌ NO getInitCode method found on account!');
        }

        this.logger.warn('🔥 Now calling kernelClient.sendUserOperation...');

        // 🔥 FINAL FIX: Bypass ZeroDv's broken gas estimation with explicit UserOp construction
        try {
          // First, try the direct approach (might work in some cases)
          userOpHash = await kernelClient.sendUserOperation({
            callData,
          });
        } catch (gasError) {
          this.logger.warn(
            '🔥 Direct sendUserOperation failed, using manual UserOp construction...',
          );

          // Manual UserOp construction with explicit gas limits and factory data
          const [factoryAddress, factoryData] =
            await kernelClient.account.getFactoryArgs();

          // Combine factory address + factory data into initCode (Viem expects this)
          const initCode = factoryAddress + factoryData.slice(2); // Remove '0x' from factoryData

          // Use proper paymaster configuration - check if paymaster is configured
          let paymasterAndData = '0x';
          if (
            this.config.paymasterUrl &&
            this.config.paymasterUrl !==
              '0x0000000000000000000000000000000000000000'
          ) {
            // Extract paymaster address from URL if it's a full URL
            try {
              const paymasterUrl = new URL(this.config.paymasterUrl);
              // For ZeroDev, the paymaster address is usually in the URL path or query params
              // For now, use a placeholder that will be filled by ZeroDev
              paymasterAndData = '0x'; // ZeroDev will fill this automatically
            } catch {
              paymasterAndData = '0x'; // Default to no paymaster
            }
          }

          // Get current gas prices from the network for better estimation
          const networkConfig = this.getNetworkConfig(chainId);
          let maxFeePerGas = '0x9c7652400'; // 42 gwei default
          let maxPriorityFeePerGas = '0x3b9aca00'; // 1 gwei default

          try {
            // Try to get current gas prices from the network
            const publicClient = createPublicClient({
              chain: networkConfig,
              transport: http(networkConfig.rpcUrls.default.http[0]),
            });

            const [baseFee, priorityFee] = await Promise.all([
              publicClient
                .getBlock({ blockTag: 'latest' })
                .then((block) => block.baseFeePerGas || BigInt(0)),
              publicClient
                .estimateMaxPriorityFeePerGas()
                .catch(() => BigInt(1000000000)), // 1 gwei fallback
            ]);

            // Calculate max fee per gas: base fee + priority fee + buffer
            const calculatedMaxFee =
              baseFee + priorityFee + (baseFee * BigInt(20)) / BigInt(100); // 20% buffer
            maxFeePerGas = `0x${calculatedMaxFee.toString(16)}`;
            maxPriorityFeePerGas = `0x${priorityFee.toString(16)}`;

            this.logger.log('Gas prices fetched from network', {
              baseFee: baseFee.toString(),
              priorityFee: priorityFee.toString(),
              maxFeePerGas,
              maxPriorityFeePerGas,
            });
          } catch (gasError) {
            this.logger.warn(
              'Failed to fetch gas prices, using defaults',
              gasError,
            );
          }

          const userOp = {
            sender: kernelClient.account.address,
            nonce: '0x0',
            initCode, // Factory address + factory data
            callData,
            // Use higher gas limits for smart account deployment on SEI testnet
            callGasLimit: '0x4c4b40', // 500000 (increased for SEI testnet)
            verificationGasLimit: '0x4c4b40', // 500000 (increased for SEI testnet)
            preVerificationGas: '0x186a0', // 100000 (increased for SEI testnet)
            maxFeePerGas,
            maxPriorityFeePerGas,
            paymasterAndData, // Paymaster address + data
            signature: '0x', // Empty signature for now - will be filled by the account
          };

          this.logger.warn('🔥 Manual UserOp constructed:', {
            sender: userOp.sender,
            initCode: userOp.initCode?.substring(0, 50) + '...',
            callData: userOp.callData,
            callGasLimit: userOp.callGasLimit,
            verificationGasLimit: userOp.verificationGasLimit,
            paymasterAndData: userOp.paymasterAndData,
          });

          // Use the low-level sendUserOperation with explicit UserOp
          // Since kernelClient.sendUserOperation doesn't accept raw UserOp, submit directly to bundler
          this.logger.warn(
            '🔥 Submitting manual UserOp directly to bundler...',
          );

          // Use the existing HTTP client from viem instead of fetch
          const bundlerClient = createPublicClient({
            chain: this.getNetworkConfig(chainId),
            transport: http(this.config.bundlerUrl),
          });

          const bundlerResult = await bundlerClient.request({
            method: 'eth_sendUserOperation',
            params: [userOp, this.config.entryPointAddress],
          });

          if (!bundlerResult) {
            throw new Error('No userOpHash returned from bundler');
          }

          userOpHash = bundlerResult as string;
          this.logger.warn(
            '🔥 Manual UserOp submitted successfully to bundler:',
            userOpHash,
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error('Failed to send user operation', {
          error: errorMessage,
          callData,
          accountKeys: Object.keys(kernelClient.account || {}),
        });
        throw new Error(`Failed to send user operation: ${errorMessage}`);
      }

      this.logger.log(`User operation sent with hash: ${userOpHash}`);

      // Wait for the user operation to be mined
      let receipt;
      try {
        receipt = await kernelClient.waitForUserOperationReceipt({
          hash: userOpHash,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error('Failed to wait for user operation receipt', {
          error: errorMessage,
          userOpHash,
        });
        throw new Error(
          `Failed to wait for user operation receipt: ${errorMessage}`,
        );
      }

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
    chainId: number = SEI_TESTNET_CONFIG.id,
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
    networks: number[] = [SEI_TESTNET_CONFIG.id],
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
    chainId: number = SEI_TESTNET_CONFIG.id,
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
    chainId: number = SEI_TESTNET_CONFIG.id,
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
    chainId: number = SEI_TESTNET_CONFIG.id,
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
    const chain = SEI_TESTNET_CONFIG;
    return `${chain.blockExplorers.default.url}/tx/${transactionHash}`;
  }

  /**
   * Get the current network configuration
   */
  getNetworkConfig(chainId: number) {
    // Only SEI testnet (1328) is supported for AA here
    if (chainId !== SEI_TESTNET_CONFIG.id) {
      this.logger.warn(
        `Unknown chain ID ${chainId}, defaulting to SEI testnet (1328)`,
      );
    }
    return SEI_TESTNET_CONFIG;
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
   * Ensure kernel account has all required compatibility methods and properties
   * This is the central method that adds all missing viem-expected functionality
   */
  private ensureAccountCompatibility(
    kernelClient: any,
    ownerAddress?: string,
  ): void {
    if (!kernelClient?.account) {
      this.logger.warn('No account object found in kernel client');
      return;
    }

    // Extract owner address from the account if not provided
    const accountOwnerAddress =
      ownerAddress ||
      kernelClient.account.address ||
      kernelClient.account.owner?.address;

    this.logger.log('Ensuring account compatibility', {
      accountKeys: Object.keys(kernelClient.account),
      hasEncodeCalls: typeof kernelClient.account.encodeCalls,
      hasGetFactoryArgs: typeof kernelClient.account.getFactoryArgs,
      hasGetNonce: typeof kernelClient.account.getNonce,
      hasGetStubSignature: typeof kernelClient.account.getStubSignature,
      hasVersion: !!(kernelClient.account as any).version,
      hasEntryPoint: !!(kernelClient.account as any).entryPoint,
      ownerAddress: accountOwnerAddress,
    });

    // Add encodeCalls method if missing - this is REQUIRED for ZeroDev v5 pattern
    if (!kernelClient.account.encodeCalls) {
      this.logger.log('Adding encodeCalls method for ZeroDev v5 compatibility');
      kernelClient.account.encodeCalls = this.createEncodeCalls();
    }

    // Add getFactoryArgs method if missing - this is required by viem for factory deployment
    if (!kernelClient.account.getFactoryArgs) {
      this.logger.log('Adding getFactoryArgs method for viem compatibility', {
        ownerAddress: accountOwnerAddress,
      });
      kernelClient.account.getFactoryArgs =
        this.createGetFactoryArgs(accountOwnerAddress);
    }

    // Add getNonce method if missing
    if (!kernelClient.account.getNonce) {
      this.logger.log('Adding getNonce method for viem compatibility');
      kernelClient.account.getNonce = this.createGetNonce();
    }

    // Add version property if missing
    if (!(kernelClient.account as any).version) {
      this.logger.log('Adding version property for viem compatibility');
      (kernelClient.account as any).version = '1.0.0';
    }

    // Add entryPoint property if missing (this might be the issue)
    if (!(kernelClient.account as any).entryPoint) {
      this.logger.log('Adding entryPoint property for viem compatibility');
      (kernelClient.account as any).entryPoint = {
        address: ENTRYPOINT_ADDRESS_V07,
        version: '0.7',
      };
    }

    // Add getStubSignature method if missing
    if (!kernelClient.account.getStubSignature) {
      this.logger.log('Adding getStubSignature method for viem compatibility');
      kernelClient.account.getStubSignature = this.createGetStubSignature();
    }

    // Add getInitCode method if missing (ERC-4337 requirement for undeployed accounts)
    if (!kernelClient.account.getInitCode) {
      this.logger.log('Adding getInitCode method for ERC-4337 compatibility', {
        ownerAddress: accountOwnerAddress,
      });
      kernelClient.account.getInitCode =
        this.createGetInitCode(accountOwnerAddress);
    }

    this.logger.log('Account compatibility ensured', {
      finalAccountKeys: Object.keys(kernelClient.account),
      hasEncodeCalls: typeof kernelClient.account.encodeCalls,
      hasGetFactoryArgs: typeof kernelClient.account.getFactoryArgs,
      hasGetInitCode: typeof kernelClient.account.getInitCode,
      hasGetNonce: typeof kernelClient.account.getNonce,
      hasGetStubSignature: typeof kernelClient.account.getStubSignature,
      hasVersion: !!(kernelClient.account as any).version,
      hasEntryPoint: !!(kernelClient.account as any).entryPoint,
    });
  }

  /**
   * Create encodeCalls method for viem compatibility
   * This method encodes multiple calls into a single calldata for batch execution
   */
  private createEncodeCalls() {
    return async (calls: readonly Call[]): Promise<`0x${string}`> => {
      try {
        if (calls.length === 0) {
          throw new Error('No calls to encode');
        }

        if (calls.length === 1) {
          // Single call - encode as execute(address,uint256,bytes)
          const call = calls[0];
          return encodeFunctionData({
            abi: [
              {
                name: 'execute',
                type: 'function',
                inputs: [
                  { name: 'dest', type: 'address' },
                  { name: 'value', type: 'uint256' },
                  { name: 'func', type: 'bytes' },
                ],
                outputs: [],
              },
            ],
            functionName: 'execute',
            args: [call.to, call.value || 0n, call.data || '0x'],
          }) as `0x${string}`;
        } else {
          // Multiple calls - encode as executeBatch(address[],uint256[],bytes[])
          const dests = calls.map((call) => call.to);
          const values = calls.map((call) => call.value || 0n);
          const funcs = calls.map((call) => call.data || '0x');

          return encodeFunctionData({
            abi: [
              {
                name: 'executeBatch',
                type: 'function',
                inputs: [
                  { name: 'dest', type: 'address[]' },
                  { name: 'value', type: 'uint256[]' },
                  { name: 'func', type: 'bytes[]' },
                ],
                outputs: [],
              },
            ],
            functionName: 'executeBatch',
            args: [dests, values, funcs],
          }) as `0x${string}`;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to encode calls: ${errorMessage}`);
      }
    };
  }

  /**
   * Create getFactoryArgs method for viem compatibility
   * This method returns the factory arguments needed for account deployment
   * For ZeroDev Kernel accounts, we need to provide proper factory deployment data
   */
  private createGetFactoryArgs(ownerAddress?: string) {
    return async (): Promise<readonly [`0x${string}`, `0x${string}`]> => {
      this.logger.warn('🚨 getFactoryArgs() method called!', {
        ownerAddress,
        timestamp: new Date().toISOString(),
      });

      try {
        // ZeroDev Kernel v3.0 factory address (standard across networks)
        const KERNEL_FACTORY_ADDRESS =
          '0x5de4839a76cf55d0c90e2061ef4386d962E15ae3' as const;

        if (!ownerAddress) {
          this.logger.error(
            '❌ No owner address provided for factory args, using empty values',
          );
          return ['0x', '0x'] as const;
        }

        // Factory data for Kernel account deployment
        // This is the initialization data that tells the factory how to deploy the smart account
        const cleanOwnerAddress = ownerAddress.startsWith('0x')
          ? ownerAddress.slice(2)
          : ownerAddress;
        const paddedOwnerAddress = cleanOwnerAddress.padStart(64, '0');

        const factoryData = concat([
          '0x5fbfb9cf' as `0x${string}`, // createAccount function selector
          `0x${paddedOwnerAddress}` as `0x${string}`, // owner address (padded to 32 bytes)
          ('0x' + '0'.repeat(64)) as `0x${string}`, // salt (index 0 for deterministic address)
        ]);

        this.logger.warn('✅ Successfully generated factory args!', {
          factory: KERNEL_FACTORY_ADDRESS,
          factoryData: factoryData,
          factoryDataLength: factoryData.length,
          ownerAddress,
        });

        return [KERNEL_FACTORY_ADDRESS, factoryData] as const;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `❌ Failed to generate factory args: ${errorMessage}`,
        );
        // Fallback to empty values to prevent crashes
        return ['0x', '0x'] as const;
      }
    };
  }

  /**
   * Create getInitCode method for ERC-4337 compatibility
   * This generates the initCode needed for smart account deployment
   */
  private createGetInitCode(ownerAddress?: string) {
    return async (): Promise<`0x${string}`> => {
      this.logger.warn('🚨 getInitCode() method called!', {
        ownerAddress,
        timestamp: new Date().toISOString(),
      });

      try {
        if (!ownerAddress) {
          this.logger.error('❌ No owner address provided for initCode');
          return '0x' as `0x${string}`;
        }

        // ZeroDev Kernel v3.0 factory address
        const KERNEL_FACTORY_ADDRESS =
          '0x5de4839a76cf55d0c90e2061ef4386d962E15ae3';

        // Factory data for Kernel account deployment
        const cleanOwnerAddress = ownerAddress.startsWith('0x')
          ? ownerAddress.slice(2)
          : ownerAddress;
        const paddedOwnerAddress = cleanOwnerAddress.padStart(64, '0');

        const factoryData = concat([
          '0x5fbfb9cf' as `0x${string}`, // createAccount function selector
          `0x${paddedOwnerAddress}` as `0x${string}`, // owner address
          ('0x' + '0'.repeat(64)) as `0x${string}`, // salt
        ]);

        // initCode = factory address + factory data
        const initCode = concat([
          KERNEL_FACTORY_ADDRESS as `0x${string}`,
          factoryData,
        ]);

        this.logger.warn('✅ Generated initCode for deployment!', {
          initCodeLength: initCode.length,
          ownerAddress,
          factoryAddress: KERNEL_FACTORY_ADDRESS,
        });

        return initCode;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(`❌ Failed to generate initCode: ${errorMessage}`);
        return '0x' as `0x${string}`;
      }
    };
  }

  /**
   * Create getNonce method for viem compatibility
   * This method returns the current nonce for the smart account
   */
  private createGetNonce(smartAccountAddress?: string, chainId?: number) {
    return async (): Promise<bigint> => {
      try {
        // If we have the smart account address and chain ID, try to get the actual nonce
        if (smartAccountAddress && chainId) {
          try {
            const chain = this.getNetworkConfig(chainId);
            const publicClient = createPublicClient({
              chain,
              transport: http(chain.rpcUrls.default.http[0]),
            });

            // Get the transaction count (nonce) for the smart account
            const nonce = await publicClient.getTransactionCount({
              address: smartAccountAddress as `0x${string}`,
            });

            const nonceBigInt = BigInt(nonce);

            this.logger.log('Retrieved actual nonce for smart account', {
              smartAccountAddress,
              nonce: nonceBigInt.toString(),
            });

            return nonceBigInt;
          } catch (error) {
            this.logger.warn(
              'Failed to retrieve actual nonce, using default',
              error,
            );
          }
        }

        // Fallback to 0n for initial deployment or if nonce query fails
        // The ZeroDev SDK will handle nonce management internally
        return 0n;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to get nonce: ${errorMessage}`);
      }
    };
  }

  /**
   * Create getStubSignature method for viem compatibility
   * This method returns a stub signature for gas estimation
   */
  private createGetStubSignature() {
    return async (): Promise<`0x${string}`> => {
      try {
        // Return a valid stub signature for gas estimation
        // This is a standard ECDSA signature format with dummy values
        // The ZeroDev SDK will replace this with the actual signature
        const stubSignature =
          '0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c';

        return stubSignature as `0x${string}`;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to get stub signature: ${errorMessage}`);
      }
    };
  }

  /**
   * Check if a smart account is deployed on the blockchain
   */
  private async isSmartAccountDeployed(
    smartAccountAddress: string,
    chainId: number,
  ): Promise<boolean> {
    try {
      const chain = this.getNetworkConfig(chainId);
      const publicClient = createPublicClient({
        chain,
        transport: http(chain.rpcUrls.default.http[0]),
      });

      // Get the code at the smart account address
      const code = await publicClient.getBytecode({
        address: smartAccountAddress as `0x${string}`,
      });

      // If code exists and is not '0x', the account is deployed
      const isDeployed = !!code && code !== '0x';

      this.logger.log('Smart account deployment check', {
        address: smartAccountAddress,
        chainId,
        hasCode: !!code,
        codeLength: code?.length || 0,
        isDeployed,
      });

      return isDeployed;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to check smart account deployment: ${errorMessage}`,
      );
      // If we can't check, assume it's not deployed to be safe
      return false;
    }
  }

  /**
   * Get the ZeroDev configuration
   */
  getConfig(): ZeroDevConfig {
    return this.config;
  }
}
