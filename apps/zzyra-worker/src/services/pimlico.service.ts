import { Injectable, Logger } from '@nestjs/common';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  Address,
  parseUnits,
  encodeFunctionData,
  Hex,
  toHex,
  keccak256,
  encodePacked,
} from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { sepolia, base, baseSepolia, seiTestnet } from 'viem/chains';
import { IAccountAbstractionService } from './blockchain/base/IBlockchainService';
import {
  TransactionRequest as BlockchainTransactionRequest,
  TransactionResult as BlockchainTransactionResult,
  GasEstimate,
  ChainConfig,
} from './blockchain/types/blockchain.types';

// EntryPoint v0.6 address (widely supported by Pimlico)
const ENTRYPOINT_ADDRESS_V07 = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

// SimpleAccount factory address for v0.6 (canonical)
const SIMPLE_ACCOUNT_FACTORY = '0x5de4839a76cf55d0c90e2061ef4386d962E15ae3';

// ERC20 ABI for token transfers
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
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

interface PimlicoAccountConfig {
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

interface UserOperation {
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

@Injectable()
export class PimlicoService implements IAccountAbstractionService {
  private readonly logger = new Logger(PimlicoService.name);

  // Store discovered implementation addresses for proxy contracts
  private proxyImplementations = new Map<string, string>();

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
   * Create clients for blockchain operations
   */
  private createClients(chainId: number) {
    const chain = this.getChainConfig(chainId);
    const bundlerUrl = `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${this.pimlicoApiKey}`;
    const paymasterUrl = `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${this.pimlicoApiKey}`;

    const publicClient = createPublicClient({
      transport: http(chain.rpcUrls.default.http[0]),
      chain,
    });

    return {
      publicClient,
      chain,
      bundlerUrl,
      paymasterUrl,
    };
  }

  /**
   * Calculate smart account address using CREATE2 with proper initCode
   */
  private calculateSmartAccountAddress(
    owner: string,
    salt: string = '0x0000000000000000000000000000000000000000000000000000000000000000',
  ): string {
    try {
      // Create proper initCode for SimpleAccount creation
      // This represents the bytecode that will be deployed
      const initCode = encodePacked(
        ['address', 'bytes'],
        [
          SIMPLE_ACCOUNT_FACTORY as Address,
          encodeFunctionData({
            abi: [
              {
                inputs: [
                  { name: 'owner', type: 'address' },
                  { name: 'salt', type: 'uint256' },
                ],
                name: 'createAccount',
                outputs: [{ name: '', type: 'address' }],
                stateMutability: 'nonpayable',
                type: 'function',
              },
            ],
            functionName: 'createAccount',
            args: [owner as Address, BigInt(salt)],
          }),
        ],
      );

      // Calculate initCode hash
      const initCodeHash = keccak256(initCode);

      // CREATE2 address calculation: keccak256(0xff ++ factory ++ salt ++ initCodeHash)
      const address = keccak256(
        encodePacked(
          ['bytes1', 'address', 'bytes32', 'bytes32'],
          [
            '0xff',
            SIMPLE_ACCOUNT_FACTORY as Address,
            salt as `0x${string}`,
            initCodeHash,
          ],
        ),
      );

      // Take the last 20 bytes and convert to address
      const calculatedAddress = `0x${address.slice(26)}` as Address;
      
      this.logger.log('✅ Calculated smart account address using CREATE2', {
        owner,
        salt,
        calculatedAddress,
        factory: SIMPLE_ACCOUNT_FACTORY,
        method: 'create2_deterministic',
      });

      return calculatedAddress;
    } catch (error) {
      this.logger.error('❌ Failed to calculate smart account address', {
        error: error instanceof Error ? error.message : String(error),
        owner,
        salt,
      });
      throw new Error(
        `Failed to calculate smart account address: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Create a smart account using Pimlico
   * Returns the smart account details including computed address
   */
  async createSmartAccount(config: PimlicoAccountConfig): Promise<{
    smartAccountAddress: string;
    ownerAddress: string;
    chainId: number;
    delegationMode: string;
    deploymentRequired: boolean;
    smartAccountClient?: any;
  }> {
    try {
      const { publicClient, bundlerUrl } = this.createClients(config.chainId);

      // Create owner account from private key
      const owner = privateKeyToAccount(
        config.ownerPrivateKey as `0x${string}`,
      );

      this.logger.log(
        `Creating Pimlico smart account for chain ${config.chainId}`,
        {
          ownerAddress: owner.address,
          delegationMode: config.delegationMode || 'immediate',
          bundlerUrl,
        },
      );

      // Calculate smart account address using CREATE2
      const salt =
        '0x0000000000000000000000000000000000000000000000000000000000000000';
      const smartAccountAddress = this.calculateSmartAccountAddress(
        owner.address,
        salt,
      );

      // Check if account needs deployment
      const code = await publicClient.getBytecode({
        address: smartAccountAddress as Address,
      });
      const deploymentRequired = !code || code === '0x';

      this.logger.log(`Pimlico smart account created`, {
        smartAccountAddress,
        ownerAddress: owner.address,
        deploymentRequired,
        chainId: config.chainId,
        factory: SIMPLE_ACCOUNT_FACTORY,
        entryPoint: ENTRYPOINT_ADDRESS_V07,
      });

      return {
        smartAccountAddress,
        ownerAddress: owner.address,
        chainId: config.chainId,
        delegationMode: config.delegationMode || 'immediate',
        deploymentRequired,
        smartAccountClient: {
          address: smartAccountAddress,
          owner: owner.address,
          factory: SIMPLE_ACCOUNT_FACTORY,
          entryPoint: ENTRYPOINT_ADDRESS_V07,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to create Pimlico smart account: ${error}`, {
        chainId: config.chainId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(
        `Failed to create smart account: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Execute a transaction using session key with Account Abstraction
   */
  async executeWithSessionKey(
    sessionConfig: SessionKeyConfig,
    transaction: TransactionRequest,
  ): Promise<BlockchainTransactionResult> {
    try {
      const { publicClient, chain, bundlerUrl, paymasterUrl } =
        this.createClients(transaction.chainId);

      // Create session key signer
      const sessionKeySigner = privateKeyToAccount(
        sessionConfig.sessionPrivateKey as `0x${string}`,
      );

      this.logger.log(`Executing AA transaction with Pimlico session key`, {
        sessionKeyAddress: sessionKeySigner.address,
        smartWalletAddress: sessionConfig.smartWalletAddress,
        to: transaction.to,
        value: transaction.value,
        chainId: transaction.chainId,
      });

      // Validate permissions
      this.validateTransactionPermissions(sessionConfig, transaction);

      // Create user operation for AA execution
      // Use implementation address if this is a proxy contract
      const actualSmartAccountAddress = this.getImplementationAddress(
        sessionConfig.smartWalletAddress,
      );

      this.logger.log('🔧 Creating UserOperation for smart account', {
        originalAddress: sessionConfig.smartWalletAddress,
        actualAddress: actualSmartAccountAddress,
        isProxy: actualSmartAccountAddress !== sessionConfig.smartWalletAddress,
      });

      const userOp = await this.createUserOperation(
        actualSmartAccountAddress, // Use implementation address for proxy contracts
        transaction,
        sessionKeySigner,
        bundlerUrl,
        paymasterUrl,
      );

      // Log detailed UserOperation before submission (for debugging AA23 issues)
      this.logger.debug('Submitting UserOperation to bundler', {
        sender: userOp.sender,
        nonce: userOp.nonce,
        initCodeLength: userOp.initCode.length,
        callDataLength: userOp.callData.length,
        callGasLimit: userOp.callGasLimit,
        verificationGasLimit: userOp.verificationGasLimit,
        preVerificationGas: userOp.preVerificationGas,
        maxFeePerGas: userOp.maxFeePerGas,
        maxPriorityFeePerGas: userOp.maxPriorityFeePerGas,
        paymasterAndData: userOp.paymasterAndData === '0x' ? 'none' : 'present',
        signatureLength: userOp.signature.length,
        bundlerUrl: bundlerUrl.split('?')[0], // Remove API key from logs
        // Convert hex values to decimal for easier reading
        gasLimitsDecimal: {
          callGasLimit: parseInt(userOp.callGasLimit, 16),
          verificationGasLimit: parseInt(userOp.verificationGasLimit, 16),
          preVerificationGas: parseInt(userOp.preVerificationGas, 16),
        },
        // Debug session key info
        sessionKeyAddress: privateKeyToAccount(
          sessionConfig.sessionPrivateKey as `0x${string}`,
        ).address,
        smartWalletAddress: sessionConfig.smartWalletAddress,
      });

      // Submit user operation to Pimlico bundler
      const userOpHash = await this.submitUserOperation(userOp, bundlerUrl);

      // Wait for user operation to be mined
      const receipt = await this.waitForUserOperationReceipt(
        userOpHash,
        bundlerUrl,
      );

      // Ensure we have a valid transaction hash
      const transactionHash =
        receipt.receipt?.transactionHash ||
        receipt.transactionHash ||
        userOpHash;

      const success =
        receipt.success !== undefined ? receipt.success : !!receipt.receipt;
      const gasUsed = receipt.receipt?.gasUsed?.toString() || '0';

      this.logger.log(`AA transaction executed successfully`, {
        userOperationHash: userOpHash,
        transactionHash,
        gasUsed,
        success,
        receiptStructure: Object.keys(receipt),
      });

      return {
        hash: transactionHash,
        success,
        status: success ? 'success' : 'failed',
        gasUsed,
        blockNumber: receipt.receipt?.blockNumber
          ? Number(receipt.receipt.blockNumber)
          : undefined,
        explorerUrl: this.getExplorerUrl(transaction.chainId, transactionHash),
      };
    } catch (error) {
      this.logger.error(
        `Failed to execute AA transaction with session key: ${error}`,
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
   * Create a User Operation for AA execution
   */
  private async createUserOperation(
    sender: string,
    transaction: TransactionRequest,
    signer: any,
    bundlerUrl: string,
    paymasterUrl: string,
  ): Promise<UserOperation> {
    // Validate transaction value
    const transactionValue = this.validateAndNormalizeValue(transaction.value);

    // Create call data for SimpleAccount (correct ABI)
    let callData: string;
    if (transaction.data && transaction.data !== '0x') {
      // Contract interaction - use SimpleAccount's execute function
      callData = encodeFunctionData({
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
            stateMutability: 'nonpayable',
          },
        ],
        functionName: 'execute',
        args: [
          transaction.to as `0x${string}`,
          parseEther(transactionValue),
          transaction.data as `0x${string}`,
        ],
      });
    } else {
      // Simple native token transfer
      callData = encodeFunctionData({
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
            stateMutability: 'nonpayable',
          },
        ],
        functionName: 'execute',
        args: [
          transaction.to as `0x${string}`,
          parseEther(transactionValue),
          '0x' as `0x${string}`,
        ],
      });
    }

    // Get nonce from EntryPoint
    const nonce = await this.getNonce(sender, bundlerUrl);

    // Check if smart account exists and generate initCode if needed
    const initCode = await this.getInitCode(
      sender,
      signer.address,
      transaction.chainId,
    );

    // Use very high gas limits to prevent AA23 errors (per Pimlico documentation)
    const isDeployment = initCode !== '0x';
    const baseCallGasLimit = isDeployment ? 1200000 : 500000; // Increased significantly
    const baseVerificationGasLimit = isDeployment ? 800000 : 600000; // Much higher verification gas
    const basePreVerificationGas = isDeployment ? 150000 : 100000; // Higher pre-verification

    this.logger.debug('Using base gas limits', {
      isDeployment,
      baseCallGasLimit,
      baseVerificationGasLimit,
      basePreVerificationGas,
    });

    // Estimate gas costs using Pimlico
    const gasEstimates = await this.estimateUserOperationGas(
      {
        sender,
        nonce: toHex(nonce),
        initCode,
        callData,
        callGasLimit: toHex(baseCallGasLimit),
        verificationGasLimit: toHex(baseVerificationGasLimit),
        preVerificationGas: toHex(basePreVerificationGas),
        maxFeePerGas: toHex(2000000000), // 2 gwei
        maxPriorityFeePerGas: toHex(1000000000), // 1 gwei
        paymasterAndData: '0x',
        signature: '0x',
      },
      bundlerUrl,
    );

    // Get paymaster data for sponsorship
    const paymasterData = await this.getPaymasterData(
      {
        sender,
        nonce: toHex(nonce),
        initCode,
        callData,
        callGasLimit: gasEstimates.callGasLimit,
        verificationGasLimit: gasEstimates.verificationGasLimit,
        preVerificationGas: gasEstimates.preVerificationGas,
        maxFeePerGas: gasEstimates.maxFeePerGas,
        maxPriorityFeePerGas: gasEstimates.maxPriorityFeePerGas,
        paymasterAndData: '0x',
        signature: '0x',
      },
      paymasterUrl,
    );

    // Ensure final gas limits are at least our base minimums
    const finalGasLimits = {
      callGasLimit: this.getMaxGasLimit(
        gasEstimates.callGasLimit,
        toHex(baseCallGasLimit),
      ),
      verificationGasLimit: this.getMaxGasLimit(
        gasEstimates.verificationGasLimit,
        toHex(baseVerificationGasLimit),
      ),
      preVerificationGas: this.getMaxGasLimit(
        gasEstimates.preVerificationGas,
        toHex(basePreVerificationGas),
      ),
    };

    this.logger.debug('Final gas limits after base limit enforcement', {
      estimated: {
        callGasLimit: gasEstimates.callGasLimit,
        verificationGasLimit: gasEstimates.verificationGasLimit,
        preVerificationGas: gasEstimates.preVerificationGas,
      },
      final: finalGasLimits,
    });

    // Create final user operation
    const userOp: UserOperation = {
      sender,
      nonce: toHex(nonce),
      initCode,
      callData,
      callGasLimit: finalGasLimits.callGasLimit,
      verificationGasLimit: finalGasLimits.verificationGasLimit,
      preVerificationGas: finalGasLimits.preVerificationGas,
      maxFeePerGas: gasEstimates.maxFeePerGas,
      maxPriorityFeePerGas: gasEstimates.maxPriorityFeePerGas,
      paymasterAndData: paymasterData.paymasterAndData,
      signature: '0x', // Will be filled after signing
    };

    this.logger.debug('Created UserOperation', {
      sender: userOp.sender,
      nonce: userOp.nonce,
      hasInitCode: initCode !== '0x',
      callDataLength: callData.length,
      isDeployment,
    });

    // Verify sender balance for prefund (as per Pimlico documentation)
    await this.verifyPrefundBalance(userOp, transaction.chainId);

    // DEBUG: Verify smart account is accessible and functional
    this.logger.log('🔍 STARTING CRITICAL SMART ACCOUNT DIAGNOSTICS 🔍');
    try {
      await this.diagnosticCheckSmartAccount(
        userOp.sender,
        transaction.chainId,
        signer.address,
      );
      this.logger.log('✅ SMART ACCOUNT DIAGNOSTICS COMPLETED');
    } catch (diagnosticsError) {
      this.logger.error('❌ SMART ACCOUNT DIAGNOSTICS FAILED', {
        error:
          diagnosticsError instanceof Error
            ? diagnosticsError.message
            : String(diagnosticsError),
        smartAccountAddress: userOp.sender,
        chainId: transaction.chainId,
      });
    }

    // DEBUG: Check paymaster funding and configuration
    this.logger.log('🔍 STARTING PAYMASTER DIAGNOSTICS 🔍');
    try {
      await this.diagnosticCheckPaymaster(
        userOp,
        paymasterUrl,
        transaction.chainId,
      );
      this.logger.log('✅ PAYMASTER DIAGNOSTICS COMPLETED');
    } catch (paymasterDiagError) {
      this.logger.error('❌ PAYMASTER DIAGNOSTICS FAILED', {
        error:
          paymasterDiagError instanceof Error
            ? paymasterDiagError.message
            : String(paymasterDiagError),
      });
    }

    // Sign the user operation
    const userOpHash = this.getUserOperationHash(
      userOp,
      ENTRYPOINT_ADDRESS_V07,
      transaction.chainId,
    );

    try {
      // Try multiple signature formats to find the one that works
      this.logger.debug('Attempting UserOperation signing', {
        userOpHashPreview: userOpHash.slice(0, 10) + '...',
        signerAddress: signer.address,
        sender: userOp.sender,
        nonce: userOp.nonce,
      });

      // Method 1: Try raw UserOperation hash (most common for AA)
      let signature: string;
      try {
        signature = await signer.signMessage({
          message: {
            raw: userOpHash as `0x${string}`,
          },
        });

        this.logger.debug('Raw hash signature successful', {
          signatureLength: signature.length,
          signaturePreview: signature.slice(0, 10) + '...',
        });
      } catch (rawError) {
        this.logger.warn('Raw hash signing failed, trying EIP-191 format', {
          rawError,
        });

        // Method 2: Fallback to EIP-191 format
        const messageHash = keccak256(
          encodePacked(
            ['string', 'bytes32'],
            ['\x19Ethereum Signed Message:\n32', userOpHash as `0x${string}`],
          ),
        );

        signature = await signer.signMessage({
          message: {
            raw: messageHash as `0x${string}`,
          },
        });

        this.logger.debug('EIP-191 signature successful', {
          messageHashPreview: messageHash.slice(0, 10) + '...',
          signatureLength: signature.length,
        });
      }

      userOp.signature = signature;

      this.logger.debug('UserOperation signed successfully', {
        userOpHashPreview: userOpHash.slice(0, 10) + '...',
        signatureLength: signature.length,
        signerAddress: signer.address,
        sender: userOp.sender,
        nonce: userOp.nonce,
      });
    } catch (error) {
      this.logger.error('Failed to sign UserOperation with both methods', {
        error: error instanceof Error ? error.message : String(error),
        signer: signer.address,
        sender: userOp.sender,
        userOpHash: userOpHash.slice(0, 20) + '...',
      });
      throw new Error(`UserOperation signing failed: ${error}`);
    }

    return userOp;
  }

  /**
   * Submit user operation to Pimlico bundler
   */
  private async submitUserOperation(
    userOp: UserOperation,
    bundlerUrl: string,
  ): Promise<string> {
    const response = await fetch(bundlerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_sendUserOperation',
        params: [userOp, ENTRYPOINT_ADDRESS_V07],
      }),
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(`Bundler error: ${result.error.message}`);
    }

    return result.result;
  }

  /**
   * Wait for user operation receipt
   */
  private async waitForUserOperationReceipt(
    userOpHash: string,
    bundlerUrl: string,
  ): Promise<any> {
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max wait

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(bundlerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_getUserOperationReceipt',
            params: [userOpHash],
          }),
        });

        if (!response.ok) {
          this.logger.debug(
            `Receipt check HTTP error ${response.status}, retrying...`,
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
          attempts++;
          continue;
        }

        const result = await response.json();

        if (result.error) {
          // Some bundlers return errors when receipt is not ready yet
          this.logger.debug(
            `Receipt check RPC error: ${result.error.message}, retrying...`,
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
          attempts++;
          continue;
        }

        if (result.result) {
          // Validate the receipt structure
          if (result.result.receipt || result.result.success !== undefined) {
            return result.result;
          } else {
            this.logger.debug(
              'Invalid receipt structure received, retrying...',
            );
          }
        }
      } catch (error) {
        this.logger.debug(`Receipt check failed: ${error}, retrying...`);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error(
      `User operation receipt timeout after ${maxAttempts} seconds`,
    );
  }

  /**
   * Get initCode for smart account deployment (if needed)
   */
  private async getInitCode(
    smartAccountAddress: string,
    ownerAddress: string,
    chainId: number,
  ): Promise<string> {
    try {
      const { publicClient } = this.createClients(chainId);

      // Check if smart account already exists
      const code = await publicClient.getBytecode({
        address: smartAccountAddress as Address,
      });

      // If account exists (has code), no deployment needed
      if (code && code !== '0x') {
        this.logger.debug('Smart account already deployed', {
          smartAccountAddress,
        });
        return '0x';
      }

      // Account doesn't exist, generate initCode for deployment
      this.logger.debug('Smart account needs deployment, generating initCode', {
        smartAccountAddress,
        ownerAddress,
      });

      // Generate initCode: factory address + createAccount calldata
      const createAccountData = encodeFunctionData({
        abi: [
          {
            name: 'createAccount',
            type: 'function',
            inputs: [
              { name: 'owner', type: 'address' },
              { name: 'salt', type: 'uint256' },
            ],
            outputs: [{ name: 'ret', type: 'address' }],
            stateMutability: 'nonpayable',
          },
        ],
        functionName: 'createAccount',
        args: [ownerAddress as Address, BigInt(0)], // salt = 0
      });

      // Combine factory address with createAccount data
      const initCode = SIMPLE_ACCOUNT_FACTORY + createAccountData.slice(2);

      this.logger.debug('Generated initCode for deployment', {
        factory: SIMPLE_ACCOUNT_FACTORY,
        initCodeLength: initCode.length,
      });

      return initCode;
    } catch (error) {
      this.logger.warn(
        `Failed to check account deployment status: ${error}, assuming deployment needed`,
      );

      // If we can't check, assume deployment is needed
      const createAccountData = encodeFunctionData({
        abi: [
          {
            name: 'createAccount',
            type: 'function',
            inputs: [
              { name: 'owner', type: 'address' },
              { name: 'salt', type: 'uint256' },
            ],
            outputs: [{ name: 'ret', type: 'address' }],
            stateMutability: 'nonpayable',
          },
        ],
        functionName: 'createAccount',
        args: [ownerAddress as Address, BigInt(0)],
      });

      return SIMPLE_ACCOUNT_FACTORY + createAccountData.slice(2);
    }
  }

  /**
   * Verify sender has enough balance for prefund (per Pimlico AA23 documentation)
   */
  private async verifyPrefundBalance(
    userOp: UserOperation,
    chainId: number,
  ): Promise<void> {
    try {
      const { publicClient } = this.createClients(chainId);

      // Calculate required prefund: maxFeePerGas * (callGasLimit + verificationGasLimit + preVerificationGas)
      const callGasLimit = BigInt(userOp.callGasLimit);
      const verificationGasLimit = BigInt(userOp.verificationGasLimit);
      const preVerificationGas = BigInt(userOp.preVerificationGas);
      const maxFeePerGas = BigInt(userOp.maxFeePerGas);

      const totalGasLimit =
        callGasLimit + verificationGasLimit + preVerificationGas;
      const requiredPrefund = maxFeePerGas * totalGasLimit;

      this.logger.debug('Calculating prefund requirements', {
        callGasLimit: callGasLimit.toString(),
        verificationGasLimit: verificationGasLimit.toString(),
        preVerificationGas: preVerificationGas.toString(),
        maxFeePerGas: maxFeePerGas.toString(),
        totalGasLimit: totalGasLimit.toString(),
        requiredPrefund: requiredPrefund.toString(),
      });

      // Check sender balance
      const senderBalance = await publicClient.getBalance({
        address: userOp.sender as Address,
      });

      this.logger.debug('Sender balance check', {
        sender: userOp.sender,
        balance: senderBalance.toString(),
        requiredPrefund: requiredPrefund.toString(),
        hasEnoughBalance: senderBalance >= requiredPrefund,
      });

      // Only check balance if not using paymaster
      if (!userOp.paymasterAndData || userOp.paymasterAndData === '0x') {
        if (senderBalance < requiredPrefund) {
          throw new Error(
            `Sender address does not have enough native tokens. ` +
              `Required: ${requiredPrefund.toString()} wei, ` +
              `Available: ${senderBalance.toString()} wei, ` +
              `Shortfall: ${(requiredPrefund - senderBalance).toString()} wei`,
          );
        }
      } else {
        this.logger.debug('Using paymaster, skipping sender balance check');
      }
    } catch (error) {
      this.logger.error('Prefund balance verification failed', { error });
      throw error;
    }
  }

  /**
   * Diagnostic check to understand smart account issues
   */
  private async diagnosticCheckSmartAccount(
    smartAccountAddress: string,
    chainId: number,
    sessionKeyAddress: string,
  ): Promise<void> {
    try {
      const { publicClient } = this.createClients(chainId);

      this.logger.debug('Running smart account diagnostics', {
        smartAccountAddress,
        sessionKeyAddress,
        chainId,
      });

      // 1. Check if smart account has code (is deployed)
      const code = await publicClient.getBytecode({
        address: smartAccountAddress as Address,
      });

      const isDeployed = code && code !== '0x';
      this.logger.debug('Smart account deployment check', {
        smartAccountAddress,
        isDeployed,
        codeLength: code?.length || 0,
        codePreview: code ? code.slice(0, 20) + '...' : 'none',
      });

      if (!isDeployed) {
        this.logger.warn(
          'Smart account is not deployed - this will cause AA23 errors',
        );
        return;
      }

      // 1.5. Attempt to identify smart account type
      await this.identifySmartAccountType(smartAccountAddress, publicClient);

      // 2. Try to call a simple view function to test if the account is functional
      try {
        // Try to get EntryPoint from the smart account (standard SimpleAccount function)
        const entryPointCall = await publicClient.call({
          to: smartAccountAddress as `0x${string}`,
          data: '0xb0d691fe' as `0x${string}`, // entryPoint() function selector
        });

        if (entryPointCall.data) {
          // Parse the returned EntryPoint address
          const accountEntryPoint = '0x' + entryPointCall.data.slice(-40);
          const isEntryPointMatch =
            accountEntryPoint.toLowerCase() ===
            ENTRYPOINT_ADDRESS_V07.toLowerCase();

          this.logger.debug('Smart account entryPoint call', {
            success: true,
            accountEntryPoint,
            ourEntryPoint: ENTRYPOINT_ADDRESS_V07,
            isEntryPointMatch,
            rawResult: entryPointCall.data,
          });

          if (!isEntryPointMatch) {
            this.logger.error(
              'CRITICAL: Smart account uses different EntryPoint!',
              {
                accountEntryPoint,
                ourEntryPoint: ENTRYPOINT_ADDRESS_V07,
                smartAccountAddress,
                chainId,
              },
            );
          }
        } else {
          this.logger.warn('Smart account entryPoint call returned no data');
        }
      } catch (callError) {
        this.logger.warn('Smart account entryPoint function call failed', {
          callError:
            callError instanceof Error ? callError.message : String(callError),
          smartAccountAddress,
        });
      }

      // 3. Check if this looks like a valid smart account by checking common functions
      try {
        // Try to call getNonce function
        const nonceCallData = encodeFunctionData({
          abi: [
            {
              name: 'getNonce',
              type: 'function',
              inputs: [],
              outputs: [{ name: 'nonce', type: 'uint256' }],
              stateMutability: 'view',
            },
          ],
          functionName: 'getNonce',
          args: [],
        });

        const nonceResult = await publicClient.call({
          to: smartAccountAddress as `0x${string}`,
          data: nonceCallData as `0x${string}`,
        });

        this.logger.debug('Smart account nonce check', {
          success: !!nonceResult.data,
          nonce: nonceResult.data ? parseInt(nonceResult.data, 16) : 'failed',
        });
      } catch (nonceError) {
        this.logger.warn('Smart account nonce check failed', { nonceError });
      }

      this.logger.debug('Smart account diagnostics completed', {
        summary: {
          isDeployed,
          smartAccountAddress,
          sessionKeyAddress,
          chainId,
          entryPoint: ENTRYPOINT_ADDRESS_V07,
        },
      });
    } catch (error) {
      this.logger.error('Smart account diagnostic check failed', {
        error: error instanceof Error ? error.message : String(error),
        smartAccountAddress,
        sessionKeyAddress,
        chainId,
      });
    }
  }

  /**
   * Diagnostic check for paymaster funding and configuration issues
   */
  private async diagnosticCheckPaymaster(
    userOp: any,
    paymasterUrl: string,
    chainId: number,
  ): Promise<void> {
    try {
      this.logger.debug('Running paymaster diagnostics', {
        paymasterUrl: paymasterUrl.split('?')[0], // Remove API key
        entryPoint: ENTRYPOINT_ADDRESS_V07,
        chainId,
        sender: userOp.sender,
      });

      // Test 1: Try current EntryPoint
      const currentResult = await this.testPaymasterWithEntryPoint(
        userOp,
        paymasterUrl,
        ENTRYPOINT_ADDRESS_V07,
        'Current EntryPoint (v0.6)',
      );

      // Test 2: Try v0.7 EntryPoint address
      const v07Result = await this.testPaymasterWithEntryPoint(
        userOp,
        paymasterUrl,
        '0x0000000071727De22E5E9d8BAf0edAc6f37da032', // v0.7
        'EntryPoint v0.7',
      );

      // Test 3: Check Pimlico's supported EntryPoints
      await this.checkSupportedEntryPoints(paymasterUrl);

      // Test 4: If we got a paymaster, check its balance
      if (currentResult.paymasterAddress) {
        await this.checkPaymasterBalance(
          currentResult.paymasterAddress,
          chainId,
        );
      } else if (v07Result.paymasterAddress) {
        await this.checkPaymasterBalance(v07Result.paymasterAddress, chainId);
      }

      this.logger.debug('Paymaster diagnostics completed', {
        currentEntryPointWorks: currentResult.success,
        v07EntryPointWorks: v07Result.success,
        hasPaymaster: !!(
          currentResult.paymasterAddress || v07Result.paymasterAddress
        ),
        chainId,
      });
    } catch (error) {
      this.logger.error('Paymaster diagnostic check failed', {
        error: error instanceof Error ? error.message : String(error),
        chainId,
        paymasterUrl: paymasterUrl.split('?')[0],
      });
    }
  }

  /**
   * Test paymaster with specific EntryPoint address
   */
  private async testPaymasterWithEntryPoint(
    userOp: any,
    paymasterUrl: string,
    entryPoint: string,
    description: string,
  ): Promise<{ success: boolean; paymasterAddress?: string; error?: string }> {
    try {
      this.logger.debug(`Testing paymaster with ${description}`, {
        entryPoint,
        paymasterUrl: paymasterUrl.split('?')[0],
      });

      // Try different parameter formats to see what Pimlico expects
      const parameterFormats = [
        // Format 1: Object with entryPoint
        [userOp, { entryPoint }],
        // Format 2: Direct EntryPoint string
        [userOp, entryPoint],
        // Format 3: Explicit EntryPoint field name
        [userOp, { entryPointAddress: entryPoint }],
      ];

      let response;
      let lastError;

      for (let i = 0; i < parameterFormats.length; i++) {
        try {
          this.logger.debug(`Trying paymaster parameter format ${i + 1}`, {
            entryPoint,
            paramFormat: i + 1,
            params: parameterFormats[i],
          });

          response = await fetch(paymasterUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'pm_sponsorUserOperation',
              params: parameterFormats[i],
            }),
          });

          const testResult = await response.json();

          if (
            !testResult.error ||
            testResult.error.message !== 'entryPoint is not a valid address'
          ) {
            this.logger.debug(
              `Parameter format ${i + 1} succeeded or gave different error`,
            );
            break; // Use this format
          } else {
            this.logger.debug(
              `Parameter format ${i + 1} failed with same EntryPoint error`,
            );
            lastError = testResult.error;
          }
        } catch (formatError) {
          this.logger.debug(
            `Parameter format ${i + 1} failed with network error`,
            {
              formatError:
                formatError instanceof Error
                  ? formatError.message
                  : String(formatError),
            },
          );
          lastError = formatError;
        }
      }

      // Handle case where all formats failed
      if (!response) {
        return {
          success: false,
          error:
            lastError instanceof Error ? lastError.message : String(lastError),
        };
      }

      const result = await response.json();

      if (result.error) {
        this.logger.warn(`${description} failed`, {
          error: result.error,
          entryPoint,
        });
        return {
          success: false,
          error: result.error.message || result.error,
        };
      }

      if (
        result.result?.paymasterAndData &&
        result.result.paymasterAndData !== '0x'
      ) {
        // Extract paymaster address (first 20 bytes after '0x')
        const paymasterAddress =
          '0x' + result.result.paymasterAndData.slice(2, 42);

        this.logger.debug(`${description} successful`, {
          entryPoint,
          paymasterAddress,
          paymasterAndDataLength: result.result.paymasterAndData.length,
        });

        return {
          success: true,
          paymasterAddress,
        };
      } else {
        this.logger.warn(`${description} returned no paymaster data`, {
          entryPoint,
          result: result.result,
        });
        return {
          success: false,
          error: 'No paymaster data returned',
        };
      }
    } catch (error) {
      this.logger.error(`${description} request failed`, {
        error: error instanceof Error ? error.message : String(error),
        entryPoint,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check what EntryPoints are supported by Pimlico
   */
  private async checkSupportedEntryPoints(paymasterUrl: string): Promise<void> {
    try {
      const response = await fetch(paymasterUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'pm_supportedEntryPoints',
          params: [],
        }),
      });

      const result = await response.json();

      if (result.result) {
        this.logger.debug('Pimlico supported EntryPoints', {
          supportedEntryPoints: result.result,
          ourEntryPoint: ENTRYPOINT_ADDRESS_V07,
          isOurEntryPointSupported: result.result.includes(
            ENTRYPOINT_ADDRESS_V07,
          ),
        });
      } else {
        this.logger.warn('Failed to get supported EntryPoints', {
          error: result.error,
        });
      }
    } catch (error) {
      this.logger.warn('Could not check supported EntryPoints', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Attempt to identify the type of smart account
   */
  private async identifySmartAccountType(
    smartAccountAddress: string,
    publicClient: any,
  ): Promise<void> {
    try {
      this.logger.debug('Identifying smart account type', {
        smartAccountAddress,
      });

      // Test for different smart account implementations
      const tests = [
        {
          name: 'SimpleAccount (ERC-4337)',
          selector: '0xb0d691fe', // entryPoint()
          description: 'Standard SimpleAccount implementation',
        },
        {
          name: 'Biconomy Smart Account',
          selector: '0x0261bf8b', // isValidSignature(bytes32,bytes)
          description: 'Biconomy modular smart account',
        },
        {
          name: 'Safe Smart Account',
          selector: '0xa0e67e2b', // getOwners()
          description: 'Gnosis Safe based account',
        },
        {
          name: 'Kernel Account',
          selector: '0x8fc925aa', // getValidationData()
          description: 'Kernel modular account',
        },
        {
          name: 'Light Account',
          selector: '0xb61d27f6', // execute(address,uint256,bytes)
          description: 'Alchemy Light Account',
        },
      ];

      const supportedFunctions = [];
      const failedFunctions = [];

      for (const test of tests) {
        try {
          const result = await publicClient.call({
            to: smartAccountAddress as `0x${string}`,
            data: test.selector as `0x${string}`,
          });

          if (result.data && result.data !== '0x') {
            supportedFunctions.push({
              name: test.name,
              selector: test.selector,
              description: test.description,
              hasData: !!result.data,
              dataLength: result.data?.length || 0,
            });
          }
        } catch (error) {
          failedFunctions.push({
            name: test.name,
            selector: test.selector,
            error:
              error instanceof Error
                ? error.message.slice(0, 100)
                : String(error).slice(0, 100),
          });
        }
      }

      this.logger.debug('Smart account type identification results', {
        smartAccountAddress,
        supportedFunctions,
        failedFunctions: failedFunctions.slice(0, 3), // Limit log size
        totalTestedFunctions: tests.length,
        workingFunctions: supportedFunctions.length,
      });

      // Determine likely account type
      if (supportedFunctions.length === 0) {
        this.logger.error(
          '🚨 CRITICAL: Smart account supports NONE of the tested interfaces - THIS IS THE ROOT CAUSE OF AA23!',
          {
            smartAccountAddress,
            testedInterfaces: tests.map((t) => t.name),
            recommendation:
              'This smart account may not be ERC-4337 compatible or uses a custom implementation',
            impact:
              'AA23 errors will continue until compatible implementation is found',
          },
        );

        // Since no standard interfaces work, let's investigate further
        this.logger.log(
          '🔬 INVESTIGATING UNKNOWN SMART ACCOUNT - DEEP ANALYSIS',
        );
        await this.investigateUnknownSmartAccount(
          smartAccountAddress,
          publicClient,
        );

        // For EIP-1967 proxies, we need to call the implementation contract
        // Check if we detected a proxy in the deep analysis
        if (supportedFunctions.length === 0) {
          this.logger.log(
            '🔧 NO STANDARD FUNCTIONS - Checking if this is a proxy contract',
          );
          await this.handleEIP1967Proxy(smartAccountAddress, publicClient);
        }
      } else if (
        supportedFunctions.find((f) => f.name.includes('SimpleAccount'))
      ) {
        this.logger.log(
          '✅ GREAT: Smart account IS SimpleAccount compatible - AA23 must be caused by something else',
          {
            smartAccountAddress,
            supportedFunctions: supportedFunctions.length,
          },
        );
      } else {
        const likelyType = supportedFunctions[0];
        this.logger.error(
          '🚨 ROOT CAUSE: Smart account is NOT SimpleAccount - THIS IS WHY AA23 FAILS!',
          {
            smartAccountAddress,
            detectedType: likelyType.name,
            description: likelyType.description,
            supportedFunctions: supportedFunctions.map((f) => ({
              name: f.name,
              description: f.description,
            })),
            recommendation:
              'UserOperation structure must be adapted for this account type',
            impact:
              'Current SimpleAccount ABI is incompatible with this smart account',
          },
        );
      }
    } catch (error) {
      this.logger.error('Smart account type identification failed', {
        error: error instanceof Error ? error.message : String(error),
        smartAccountAddress,
      });
    }
  }

  /**
   * Check paymaster contract balance
   */
  private async checkPaymasterBalance(
    paymasterAddress: string,
    chainId: number,
  ): Promise<void> {
    try {
      const { publicClient } = this.createClients(chainId);

      // Check native token balance
      const balance = await publicClient.getBalance({
        address: paymasterAddress as Address,
      });

      // Check if paymaster has a deposit in the EntryPoint
      const entryPointDepositCall = await publicClient.call({
        to: ENTRYPOINT_ADDRESS_V07 as `0x${string}`,
        data: encodeFunctionData({
          abi: [
            {
              name: 'balanceOf',
              type: 'function',
              inputs: [{ name: 'account', type: 'address' }],
              outputs: [{ name: 'balance', type: 'uint256' }],
              stateMutability: 'view',
            },
          ],
          functionName: 'balanceOf',
          args: [paymasterAddress as `0x${string}`],
        }),
      });

      const entryPointBalance = entryPointDepositCall.data
        ? parseInt(entryPointDepositCall.data, 16)
        : 0;

      this.logger.debug('Paymaster balance check', {
        paymasterAddress,
        nativeBalance: balance.toString(),
        entryPointDeposit: entryPointBalance.toString(),
        hasNativeFunds: balance > 0n,
        hasEntryPointDeposit: entryPointBalance > 0,
        chainId,
      });

      if (balance === 0n && entryPointBalance === 0) {
        this.logger.warn('Paymaster appears to be unfunded', {
          paymasterAddress,
          chainId,
        });
      }
    } catch (error) {
      this.logger.warn('Could not check paymaster balance', {
        error: error instanceof Error ? error.message : String(error),
        paymasterAddress,
        chainId,
      });
    }
  }

  /**
   * Get the maximum gas limit between estimated and our minimum requirements
   */
  private getMaxGasLimit(
    estimatedGas: string | undefined,
    minimumGas: string,
  ): string {
    if (!estimatedGas) {
      return minimumGas;
    }

    try {
      const estimated = BigInt(estimatedGas);
      const minimum = BigInt(minimumGas);
      const maxGas = estimated > minimum ? estimated : minimum;

      this.logger.debug('Gas limit comparison', {
        estimated: estimated.toString(),
        minimum: minimum.toString(),
        selected: maxGas.toString(),
        usedEstimated: estimated > minimum,
      });

      return toHex(maxGas);
    } catch (error) {
      this.logger.warn(`Failed to compare gas limits: ${error}, using minimum`);
      return minimumGas;
    }
  }

  /**
   * Validate and normalize transaction value to prevent parseEther errors
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
   * Helper methods for AA operations
   */
  private async getNonce(sender: string, bundlerUrl: string): Promise<number> {
    try {
      // Extract chain ID from bundlerUrl to get the correct RPC
      const chainIdMatch = bundlerUrl.match(/\/v2\/(\d+)\//);
      const chainId = chainIdMatch ? parseInt(chainIdMatch[1]) : 1328; // default to SEI

      // Use regular chain RPC instead of bundler for eth_call
      const { publicClient } = this.createClients(chainId);

      // For Account Abstraction, query EntryPoint contract for nonce
      const nonceCallData = encodeFunctionData({
        abi: [
          {
            name: 'getNonce',
            type: 'function',
            inputs: [
              { name: 'sender', type: 'address' },
              { name: 'key', type: 'uint192' },
            ],
            outputs: [{ name: 'nonce', type: 'uint256' }],
            stateMutability: 'view',
          },
        ],
        functionName: 'getNonce',
        args: [sender as `0x${string}`, BigInt(0)], // key = 0 for default nonce sequence
      });

      // Use the public client to make the call (not bundler)
      const result = await publicClient.call({
        to: ENTRYPOINT_ADDRESS_V07 as `0x${string}`,
        data: nonceCallData as `0x${string}`,
      });

      if (!result.data) {
        this.logger.warn('No nonce result from EntryPoint call, using nonce 0');
        return 0;
      }

      // Parse the returned nonce (should be a hex string representing uint256)
      const nonce = parseInt(result.data, 16);
      if (isNaN(nonce)) {
        this.logger.warn(
          `Invalid nonce from EntryPoint: ${result.data}, using nonce 0`,
        );
        return 0;
      }

      this.logger.debug(`Retrieved nonce from EntryPoint: ${nonce}`, {
        sender,
        entryPoint: ENTRYPOINT_ADDRESS_V07,
        chainId,
      });
      return nonce;
    } catch (error) {
      this.logger.warn(
        `Failed to get nonce from EntryPoint: ${error}, using nonce 0`,
      );
      return 0;
    }
  }

  private async estimateUserOperationGas(
    userOp: any,
    bundlerUrl: string,
  ): Promise<any> {
    // Use high default gas values to prevent AA23 errors during estimation
    const defaultGasValues = {
      callGasLimit: toHex(500000), // 500K (was 200K)
      verificationGasLimit: toHex(600000), // 600K (was 100K)
      preVerificationGas: toHex(100000), // 100K (was 21K)
      maxFeePerGas: toHex(2000000000), // 2 gwei (was 1 gwei)
      maxPriorityFeePerGas: toHex(1500000000), // 1.5 gwei (was 1 gwei)
    };

    this.logger.debug('Using high default gas values for AA23 prevention', {
      callGasLimit: '500000',
      verificationGasLimit: '600000',
      preVerificationGas: '100000',
      maxFeePerGas: '2000000000',
      maxPriorityFeePerGas: '1500000000',
    });

    try {
      const response = await fetch(bundlerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_estimateUserOperationGas',
          params: [userOp, ENTRYPOINT_ADDRESS_V07],
        }),
      });

      if (!response.ok) {
        this.logger.warn(
          `Gas estimation HTTP error ${response.status}, using defaults`,
        );
        return defaultGasValues;
      }

      const result = await response.json();

      if (result.error) {
        this.logger.warn(
          `Gas estimation RPC error: ${result.error.message}, using defaults`,
        );
        return defaultGasValues;
      }

      if (!result.result) {
        this.logger.warn('No gas estimation result, using defaults');
        return defaultGasValues;
      }

      // Validate the returned gas values and ensure they meet our minimum requirements
      const gasResult = result.result;
      const validatedGasValues = {
        callGasLimit: this.getMaxGasLimit(
          gasResult.callGasLimit,
          defaultGasValues.callGasLimit,
        ),
        verificationGasLimit: this.getMaxGasLimit(
          gasResult.verificationGasLimit,
          defaultGasValues.verificationGasLimit,
        ),
        preVerificationGas: this.getMaxGasLimit(
          gasResult.preVerificationGas,
          defaultGasValues.preVerificationGas,
        ),
        maxFeePerGas: gasResult.maxFeePerGas || defaultGasValues.maxFeePerGas,
        maxPriorityFeePerGas:
          gasResult.maxPriorityFeePerGas ||
          defaultGasValues.maxPriorityFeePerGas,
      };

      this.logger.debug('Gas values after validation', {
        estimated: {
          callGasLimit: gasResult.callGasLimit,
          verificationGasLimit: gasResult.verificationGasLimit,
          preVerificationGas: gasResult.preVerificationGas,
        },
        final: {
          callGasLimit: validatedGasValues.callGasLimit,
          verificationGasLimit: validatedGasValues.verificationGasLimit,
          preVerificationGas: validatedGasValues.preVerificationGas,
        },
      });

      return validatedGasValues;
    } catch (error) {
      this.logger.warn(`Failed to estimate gas: ${error}, using defaults`);
      return defaultGasValues;
    }
  }

  private async getPaymasterData(
    userOp: any,
    paymasterUrl: string,
  ): Promise<any> {
    const defaultPaymasterData = { paymasterAndData: '0x' };

    try {
      // ✅ FIX: Use correct Pimlico paymaster method for SEI testnet
      this.logger.debug('Requesting Pimlico paymaster sponsorship', {
        method: 'pm_sponsorUserOperation',
        entryPoint: ENTRYPOINT_ADDRESS_V07,
        sender: userOp.sender,
        paymasterUrl: paymasterUrl.split('?')[0], // Remove API key from logs
      });

      // Try different parameter formats for Pimlico paymaster
      const parameterFormats = [
        // Format 1: Standard Pimlico format with entryPoint
        [userOp, { entryPoint: ENTRYPOINT_ADDRESS_V07 }],
        // Format 2: Alternative format with sponsorshipPolicyId
        [userOp, { 
          entryPoint: ENTRYPOINT_ADDRESS_V07,
          sponsorshipPolicyId: 'sp_crazy_kangaroo' // Default policy ID
        }],
        // Format 3: Direct EntryPoint string
        [userOp, ENTRYPOINT_ADDRESS_V07],
      ];

      let response;
      let result;

      for (let i = 0; i < parameterFormats.length; i++) {
        try {
          this.logger.debug(
            `Trying paymaster format ${i + 1} in getPaymasterData`,
            {
              format: i + 1,
              entryPoint: ENTRYPOINT_ADDRESS_V07,
            },
          );

          response = await fetch(paymasterUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'pm_sponsorUserOperation',
              params: parameterFormats[i],
            }),
          });

          if (!response.ok) {
            this.logger.debug(`Format ${i + 1}: HTTP error ${response.status}`);
            continue;
          }

          result = await response.json();

          // If we got a successful result or a different error, use this format
          if (
            !result.error ||
            result.error.message !== 'entryPoint is not a valid address'
          ) {
            this.logger.debug(
              `Format ${i + 1} succeeded or gave different error`,
            );
            break;
          } else {
            this.logger.debug(`Format ${i + 1} failed with EntryPoint error`);
          }
        } catch (formatError) {
          this.logger.debug(`Format ${i + 1} failed with exception`, {
            formatError:
              formatError instanceof Error
                ? formatError.message
                : String(formatError),
          });
        }
      }

      if (!response || !result) {
        this.logger.warn(
          'All paymaster parameter formats failed, using regular gas payment',
        );
        return defaultPaymasterData;
      }

      if (result.error) {
        // ✅ ENHANCED: Better error reporting for paymaster issues
        this.logger.error(
          `🚨 Pimlico Paymaster Error: ${result.error.message}`,
          {
            errorCode: result.error.code,
            errorMessage: result.error.message,
            entryPoint: ENTRYPOINT_ADDRESS_V07,
            fullError: result.error,
            paymasterUrl: paymasterUrl.split('?')[0],
            sender: userOp.sender,
            // Add troubleshooting info
            possibleCauses: [
              'No sponsorship policy configured',
              'Insufficient paymaster funds',
              'UserOperation exceeds spending limits',
              'Chain not supported for sponsorship'
            ]
          },
        );
        return defaultPaymasterData;
      }

      if (!result.result) {
        this.logger.warn('No paymaster result, using regular gas payment');
        return defaultPaymasterData;
      }

      // ✅ SUCCESS: Paymaster sponsorship obtained!
      this.logger.log('✅ Pimlico paymaster sponsorship successful!', {
        paymasterAndData: result.result.paymasterAndData ? 'obtained' : 'empty',
        paymasterAndDataLength: result.result.paymasterAndData?.length || 0,
        sponsorshipActive: result.result.paymasterAndData !== '0x',
      });

      return result.result;
    } catch (error) {
      this.logger.warn(
        `Paymaster request failed: ${error}, using regular gas payment`,
      );
      return defaultPaymasterData;
    }
  }

  private getUserOperationHash(
    userOp: UserOperation,
    entryPoint: string,
    chainId: number,
  ): string {
    try {
      // Pack UserOperation data according to EIP-4337 specification for EntryPoint v0.6
      const packedUserOp = encodePacked(
        [
          'address',
          'uint256',
          'bytes32',
          'bytes32',
          'uint256',
          'uint256',
          'uint256',
          'uint256',
          'uint256',
          'bytes32',
        ],
        [
          userOp.sender as Address,
          BigInt(userOp.nonce),
          keccak256(userOp.initCode as Hex),
          keccak256(userOp.callData as Hex),
          BigInt(userOp.callGasLimit),
          BigInt(userOp.verificationGasLimit),
          BigInt(userOp.preVerificationGas),
          BigInt(userOp.maxFeePerGas),
          BigInt(userOp.maxPriorityFeePerGas),
          keccak256(userOp.paymasterAndData as Hex),
        ],
      );

      // Hash the packed UserOperation with EntryPoint and chain ID
      const userOpHash = keccak256(packedUserOp);

      // Create the final hash with EntryPoint and chain ID
      const finalHash = keccak256(
        encodePacked(
          ['bytes32', 'address', 'uint256'],
          [userOpHash, entryPoint as Address, BigInt(chainId)],
        ),
      );

      this.logger.debug('Generated UserOperation hash', {
        userOpHashPreview: finalHash.slice(0, 10) + '...',
        entryPoint,
        chainId,
      });

      return finalHash;
    } catch (error) {
      this.logger.error('Failed to generate UserOperation hash', { error });
      // Fallback to simple hash if the complex one fails
      const fallbackHash = keccak256(
        encodePacked(
          ['address', 'uint256', 'bytes32'],
          [
            userOp.sender as Address,
            BigInt(userOp.nonce),
            keccak256(userOp.callData as Hex),
          ],
        ),
      );
      return fallbackHash;
    }
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
      const { publicClient } = this.createClients(chainId);

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

      // For now, return that deployment is needed but not implemented
      // In full implementation, you would deploy via first user operation
      this.logger.log(`Smart wallet deployment needed`, {
        smartWalletAddress,
        chainId,
      });

      return {
        deployed: false, // Will be deployed on first transaction
      };
    } catch (error) {
      this.logger.error(`Failed to check wallet deployment: ${error}`, {
        smartWalletAddress,
        chainId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        deployed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate transaction against session key permissions
   */
  private validateTransactionPermissions(
    sessionConfig: SessionKeyConfig,
    transaction: TransactionRequest,
  ): void {
    const { permissions } = sessionConfig;

    // Check expiry
    if (new Date() > permissions.validUntil) {
      throw new Error('Session key has expired');
    }

    // Check transaction amount limits
    const txValue = parseFloat(transaction.value);
    const maxAmountPerTx = parseFloat(permissions.maxAmountPerTx);

    if (txValue > maxAmountPerTx) {
      throw new Error(
        `Transaction amount ${txValue} exceeds maximum allowed ${maxAmountPerTx}`,
      );
    }

    // Check operations (detailed validation)
    const isSendOperation = transaction.to !== sessionConfig.smartWalletAddress;
    if (isSendOperation) {
      // Determine operation type based on transaction
      const isEthTransfer = !transaction.data || transaction.data === '0x';
      const isErc20Transfer = transaction.data && transaction.data !== '0x';

      let requiredOperation: string;
      if (isEthTransfer) {
        requiredOperation = 'eth_transfer';
      } else if (isErc20Transfer) {
        requiredOperation = 'erc20_transfer';
      } else {
        requiredOperation = 'contract_interaction';
      }

      if (!permissions.operations.includes(requiredOperation)) {
        throw new Error(
          `${requiredOperation} operation not permitted for this session key. Allowed operations: ${permissions.operations.join(', ')}`,
        );
      }
    }

    this.logger.log(`Transaction permissions validated`, {
      txValue,
      maxAmountPerTx,
      operations: permissions.operations,
      validUntil: permissions.validUntil,
    });
  }

  /**
   * Execute ERC20 token transfer using AA
   */
  async executeERC20Transfer(
    sessionConfig: SessionKeyConfig,
    tokenAddress: string,
    toAddress: string,
    amount: string,
    decimals: number = 18,
  ): Promise<BlockchainTransactionResult> {
    try {
      // Validate and normalize amount
      const normalizedAmount = this.validateAndNormalizeValue(amount);

      // Encode ERC20 transfer data
      const transferData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [toAddress as Address, parseUnits(normalizedAmount, decimals)],
      });

      // Execute as contract interaction using AA
      return await this.executeWithSessionKey(sessionConfig, {
        to: tokenAddress,
        value: '0',
        data: transferData,
        chainId: sessionConfig.chainId,
      });
    } catch (error) {
      this.logger.error(`Failed to execute ERC20 transfer: ${error}`);
      return {
        hash: '',
        success: false,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get ERC20 token balance
   */
  async getERC20Balance(
    tokenAddress: string,
    walletAddress: string,
    chainId: number,
  ): Promise<string> {
    try {
      const { publicClient } = this.createClients(chainId);

      const balance = await publicClient.readContract({
        address: tokenAddress as Address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [walletAddress as Address],
      });

      return balance.toString();
    } catch (error) {
      this.logger.error(`Failed to get ERC20 balance: ${error}`);
      return '0';
    }
  }

  /**
   * Get the actual implementation address for proxy contracts
   */
  private getImplementationAddress(smartAccountAddress: string): string {
    return (
      this.proxyImplementations.get(smartAccountAddress) || smartAccountAddress
    );
  }

  /**
   * Handle EIP-1967 proxy smart accounts by calling implementation contract
   */
  private async handleEIP1967Proxy(
    proxyAddress: string,
    publicClient: any,
  ): Promise<void> {
    try {
      this.logger.log('🔧 Handling EIP-1967 proxy smart account', {
        proxyAddress,
        objective: 'Extract implementation address and test functions',
      });

      // Get implementation address from EIP-1967 storage slot
      const implementationSlot =
        '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

      const implementationAddress = await publicClient.getStorageAt({
        address: proxyAddress as `0x${string}`,
        slot: implementationSlot as `0x${string}`,
      });

      if (
        !implementationAddress ||
        implementationAddress ===
          '0x0000000000000000000000000000000000000000000000000000000000000000'
      ) {
        this.logger.error('❌ EIP-1967 proxy has no implementation address', {
          proxyAddress,
          implementationSlot,
        });
        return;
      }

      // Convert storage value to address (last 20 bytes)
      const actualImplementation = '0x' + implementationAddress.slice(-40);

      this.logger.log('🎯 Found EIP-1967 implementation contract', {
        proxyAddress,
        implementationAddress: actualImplementation,
        storageValue: implementationAddress,
      });

      // Test functions on the implementation contract
      await this.testImplementationContract(actualImplementation, publicClient);

      // Store the implementation address for UserOperation creation
      this.proxyImplementations.set(proxyAddress, actualImplementation);

      this.logger.log(
        '💾 Implementation address stored for UserOperation creation',
        {
          proxyAddress,
          implementationAddress: actualImplementation,
          storedAddresses: Array.from(this.proxyImplementations.entries()),
          recommendation:
            'UserOperation will now call functions on implementation, not proxy',
        },
      );
    } catch (error) {
      this.logger.error('❌ Failed to handle EIP-1967 proxy', {
        error: error instanceof Error ? error.message : String(error),
        proxyAddress,
      });
    }
  }

  /**
   * Test functions on the implementation contract
   */
  private async testImplementationContract(
    implementationAddress: string,
    publicClient: any,
  ): Promise<void> {
    try {
      this.logger.log('🧪 Testing implementation contract functions', {
        implementationAddress,
        objective: 'Find working ERC-4337 functions on implementation',
      });

      // Test ERC-4337 functions on implementation
      const erc4337Tests = [
        { name: 'validateUserOp', selector: '0x3a871cdd' },
        { name: 'execute', selector: '0xb61d27f6' },
        { name: 'isValidSignature', selector: '0x1626ba7e' },
        { name: 'owner', selector: '0x8da5cb5b' },
        { name: 'getNonce', selector: '0xd087d288' },
      ];

      const workingFunctions = [];

      for (const test of erc4337Tests) {
        try {
          const result = await publicClient.call({
            to: implementationAddress as `0x${string}`,
            data: test.selector as `0x${string}`,
          });

          if (result.data && result.data !== '0x') {
            workingFunctions.push({
              name: test.name,
              selector: test.selector,
              result: result.data.slice(0, 20) + '...',
            });
          }
        } catch (error) {
          // Function doesn't exist or reverted - expected
        }
      }

      if (workingFunctions.length > 0) {
        this.logger.log('🎉 IMPLEMENTATION CONTRACT HAS WORKING FUNCTIONS!', {
          implementationAddress,
          workingFunctions,
          count: workingFunctions.length,
          solution: 'Use implementation address for UserOperation calls',
        });
      } else {
        this.logger.warn(
          '❌ Implementation contract also has no working functions',
          {
            implementationAddress,
            testedFunctions: erc4337Tests.length,
          },
        );
      }
    } catch (error) {
      this.logger.error('❌ Failed to test implementation contract', {
        error: error instanceof Error ? error.message : String(error),
        implementationAddress,
      });
    }
  }

  /**
   * Deep investigation of unknown smart account implementation
   */
  private async investigateUnknownSmartAccount(
    smartAccountAddress: string,
    publicClient: any,
  ): Promise<void> {
    try {
      this.logger.log('🔬 Starting deep smart account analysis', {
        smartAccountAddress,
        objective:
          'Find compatible ABI and functions for this unknown smart account',
      });

      // 1. Analyze bytecode for proxy patterns
      const code = await publicClient.getBytecode({
        address: smartAccountAddress as Address,
      });

      const isProxy = this.analyzeBytecodeForProxy(code);
      this.logger.log('📝 Bytecode analysis results', {
        smartAccountAddress,
        codeLength: code?.length || 0,
        isLikelyProxy: isProxy.isProxy,
        proxyType: isProxy.type,
        analysis: isProxy.analysis,
      });

      // 2. Test basic ERC-4337 functions with different signatures
      await this.testERC4337Functions(smartAccountAddress, publicClient);

      // 3. Test generic contract functions
      await this.testGenericFunctions(smartAccountAddress, publicClient);

      // 4. Check for multi-sig patterns
      await this.testMultiSigPatterns(smartAccountAddress, publicClient);

      // 5. Analyze storage slots for hints
      await this.analyzeContractStorage(smartAccountAddress, publicClient);

      this.logger.log('✅ Deep smart account analysis completed', {
        smartAccountAddress,
        recommendation:
          'Check logs above for discovered functions and patterns',
      });
    } catch (error) {
      this.logger.error('❌ Deep smart account investigation failed', {
        error: error instanceof Error ? error.message : String(error),
        smartAccountAddress,
      });
    }
  }

  /**
   * Analyze bytecode to detect proxy patterns
   */
  private analyzeBytecodeForProxy(bytecode: string | undefined): {
    isProxy: boolean;
    type: string;
    analysis: string;
  } {
    if (!bytecode || bytecode === '0x') {
      return { isProxy: false, type: 'none', analysis: 'No bytecode found' };
    }

    // Common proxy patterns
    const patterns = [
      {
        name: 'EIP-1967 Proxy',
        pattern:
          '360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
      },
      {
        name: 'EIP-1822 Proxy',
        pattern:
          'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470',
      },
      {
        name: 'Gnosis Safe Proxy',
        pattern: '6352c5ab80500000000000000000000000',
      },
      { name: 'OpenZeppelin Proxy', pattern: '3659cfe6' }, // delegatecall opcode
      {
        name: 'Minimal Proxy (EIP-1167)',
        pattern: '3d602d80600a3d3981f3363d3d373d3d3d363d73',
      },
    ];

    for (const pattern of patterns) {
      if (bytecode.toLowerCase().includes(pattern.pattern.toLowerCase())) {
        return {
          isProxy: true,
          type: pattern.name,
          analysis: `Detected ${pattern.name} pattern in bytecode`,
        };
      }
    }

    // General proxy indicators
    if (bytecode.includes('delegatecall') || bytecode.length < 100) {
      return {
        isProxy: true,
        type: 'Unknown Proxy',
        analysis:
          'Bytecode suggests proxy pattern (delegatecall or minimal code)',
      };
    }

    return {
      isProxy: false,
      type: 'Implementation',
      analysis: `Full implementation contract (${bytecode.length} bytes)`,
    };
  }

  /**
   * Test ERC-4337 specific functions with different signatures
   */
  private async testERC4337Functions(
    smartAccountAddress: string,
    publicClient: any,
  ): Promise<void> {
    this.logger.log('🧪 Testing ERC-4337 specific functions', {
      smartAccountAddress,
    });

    const erc4337Tests = [
      { name: 'validateUserOp', selector: '0x3a871cdd' },
      { name: 'validateUserOp (alt)', selector: '0x9a9ba5db' },
      { name: 'execute', selector: '0xb61d27f6' },
      { name: 'execute (alt)', selector: '0x51945447' },
      { name: 'executeUserOp', selector: '0x5b89f794' },
      { name: 'isValidSignature', selector: '0x1626ba7e' },
      { name: 'owner', selector: '0x8da5cb5b' },
      { name: 'nonce', selector: '0xaffed0e0' },
      { name: 'getNonce', selector: '0xd087d288' },
      { name: 'getDeposit', selector: '0xc399ec88' },
    ];

    const workingFunctions = [];

    for (const test of erc4337Tests) {
      try {
        const result = await publicClient.call({
          to: smartAccountAddress as `0x${string}`,
          data: test.selector as `0x${string}`,
        });

        if (result.data && result.data !== '0x') {
          workingFunctions.push({
            name: test.name,
            selector: test.selector,
            result: result.data.slice(0, 20) + '...',
          });
        }
      } catch (error) {
        // Function doesn't exist or reverted - that's expected
      }
    }

    if (workingFunctions.length > 0) {
      this.logger.log('🎉 FOUND WORKING ERC-4337 FUNCTIONS!', {
        smartAccountAddress,
        workingFunctions,
        count: workingFunctions.length,
      });
    } else {
      this.logger.warn('❌ No ERC-4337 functions found', {
        smartAccountAddress,
        testedFunctions: erc4337Tests.length,
      });
    }
  }

  /**
   * Test generic contract functions
   */
  private async testGenericFunctions(
    smartAccountAddress: string,
    publicClient: any,
  ): Promise<void> {
    this.logger.log('🧪 Testing generic contract functions', {
      smartAccountAddress,
    });

    const genericTests = [
      { name: 'supportsInterface', selector: '0x01ffc9a7' },
      { name: 'name', selector: '0x06fdde03' },
      { name: 'symbol', selector: '0x95d89b41' },
      { name: 'version', selector: '0x54fd4d50' },
      { name: 'implementation', selector: '0x5c60da1b' },
      { name: 'admin', selector: '0xf851a440' },
      { name: 'getImplementation', selector: '0xaaf10f42' },
    ];

    const workingFunctions = [];

    for (const test of genericTests) {
      try {
        const result = await publicClient.call({
          to: smartAccountAddress as `0x${string}`,
          data: test.selector as `0x${string}`,
        });

        if (result.data && result.data !== '0x') {
          workingFunctions.push({
            name: test.name,
            selector: test.selector,
            result: result.data.slice(0, 20) + '...',
          });
        }
      } catch (error) {
        // Function doesn't exist - expected for many
      }
    }

    if (workingFunctions.length > 0) {
      this.logger.log('🎉 FOUND WORKING GENERIC FUNCTIONS!', {
        smartAccountAddress,
        workingFunctions,
        count: workingFunctions.length,
      });
    } else {
      this.logger.warn('❌ No generic functions found', {
        smartAccountAddress,
      });
    }
  }

  /**
   * Test multi-sig patterns
   */
  private async testMultiSigPatterns(
    smartAccountAddress: string,
    publicClient: any,
  ): Promise<void> {
    const multiSigTests = [
      { name: 'getThreshold', selector: '0xe75235b8' },
      { name: 'getOwners', selector: '0xa0e67e2b' },
      { name: 'isOwner', selector: '0x2f54bf6e' },
      { name: 'getOwnerCount', selector: '0x9ead7222' },
    ];

    const workingFunctions = [];

    for (const test of multiSigTests) {
      try {
        const result = await publicClient.call({
          to: smartAccountAddress as `0x${string}`,
          data: test.selector as `0x${string}`,
        });

        if (result.data && result.data !== '0x') {
          workingFunctions.push({
            name: test.name,
            selector: test.selector,
            result: result.data.slice(0, 20) + '...',
          });
        }
      } catch (error) {
        // Expected for non-multisig contracts
      }
    }

    if (workingFunctions.length > 0) {
      this.logger.log(
        '🔍 FOUND MULTI-SIG FUNCTIONS - This might be a multi-sig wallet!',
        {
          smartAccountAddress,
          workingFunctions,
          count: workingFunctions.length,
        },
      );
    }
  }

  /**
   * Analyze contract storage for hints
   */
  private async analyzeContractStorage(
    smartAccountAddress: string,
    publicClient: any,
  ): Promise<void> {
    try {
      // Check common storage slots
      const storageSlots = [
        { name: 'Slot 0 (often owner or implementation)', slot: '0x0' },
        {
          name: 'EIP-1967 Implementation',
          slot: '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
        },
        {
          name: 'EIP-1967 Admin',
          slot: '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103',
        },
      ];

      const storageResults = [];

      for (const slot of storageSlots) {
        try {
          const value = await publicClient.getStorageAt({
            address: smartAccountAddress as `0x${string}`,
            slot: slot.slot as `0x${string}`,
          });

          if (
            value &&
            value !==
              '0x0000000000000000000000000000000000000000000000000000000000000000'
          ) {
            storageResults.push({
              name: slot.name,
              slot: slot.slot,
              value: value.slice(0, 20) + '...',
            });
          }
        } catch (error) {
          // Storage read failed - continue
        }
      }

      if (storageResults.length > 0) {
        this.logger.log('🗄️ FOUND NON-ZERO STORAGE SLOTS', {
          smartAccountAddress,
          storageResults,
          count: storageResults.length,
        });
      }
    } catch (error) {
      this.logger.warn('Could not analyze contract storage', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // =============================================================================
  // IBlockchainService Interface Implementation
  // =============================================================================

  /**
   * Get supported chain configurations
   */
  getSupportedChains(): ChainConfig[] {
    return this.supportedChains.map((chain) => ({
      id: chain.id,
      name: chain.name,
      rpcUrl: chain.rpcUrls.default.http[0],
      explorerUrl: chain.blockExplorers?.default?.url || '',
      nativeCurrency: chain.nativeCurrency,
      testnet: 'testnet' in chain ? chain.testnet : false,
    }));
  }

  /**
   * Check if a chain is supported by this service
   */
  isChainSupported(chainId: number): boolean {
    return this.supportedChains.some((chain) => chain.id === chainId);
  }

  /**
   * Execute a standard blockchain transaction (delegates to executeWithSessionKey)
   */
  async executeTransaction(
    transaction: BlockchainTransactionRequest,
    walletConfig: { privateKey: string; address: string },
  ): Promise<BlockchainTransactionResult> {
    // Convert wallet config to session config for AA execution
    const sessionConfig = {
      sessionPrivateKey: walletConfig.privateKey,
      smartWalletAddress: walletConfig.address,
      chainId: transaction.chainId,
      permissions: {
        operations: ['eth_transfer', 'erc20_transfer', 'contract_interaction'],
        maxAmountPerTx: '1000000', // High limit for general use
        maxDailyAmount: '10000000', // High limit for general use
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    };

    return await this.executeWithSessionKey(sessionConfig, transaction);
  }

  /**
   * Estimate gas for a transaction (uses internal gas estimation)
   */
  async estimateGas(
    transaction: BlockchainTransactionRequest,
  ): Promise<GasEstimate> {
    try {
      // Create a dummy UserOperation for gas estimation
      const dummyUserOp = {
        sender: transaction.to, // Use recipient as dummy sender
        nonce: '0x0',
        initCode: '0x',
        callData: transaction.data || '0x',
        callGasLimit: '0x0',
        verificationGasLimit: '0x0',
        preVerificationGas: '0x0',
        maxFeePerGas: '0x0',
        maxPriorityFeePerGas: '0x0',
        paymasterAndData: '0x',
        signature: '0x',
      };

      const { bundlerUrl } = this.createClients(transaction.chainId);
      const gasEstimates = await this.estimateUserOperationGas(
        dummyUserOp,
        bundlerUrl,
      );

      return {
        callGasLimit: gasEstimates.callGasLimit,
        verificationGasLimit: gasEstimates.verificationGasLimit,
        preVerificationGas: gasEstimates.preVerificationGas,
        maxFeePerGas: gasEstimates.maxFeePerGas,
        maxPriorityFeePerGas: gasEstimates.maxPriorityFeePerGas,
      };
    } catch (error) {
      this.logger.warn('Gas estimation failed, using defaults', { error });
      return {
        callGasLimit: '500000',
        verificationGasLimit: '600000',
        preVerificationGas: '100000',
        maxFeePerGas: '2000000000',
        maxPriorityFeePerGas: '1000000000',
      };
    }
  }

  /**
   * Get current gas prices for the network
   */
  async getCurrentGasPrices(chainId: number): Promise<{
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
  }> {
    try {
      const { publicClient } = this.createClients(chainId);

      const gasPrice = await publicClient.getGasPrice();
      const maxFeePerGas = (gasPrice * 110n) / 100n; // 110% of current gas price
      const maxPriorityFeePerGas = gasPrice / 10n; // 10% tip

      return {
        maxFeePerGas: maxFeePerGas.toString(),
        maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
      };
    } catch (error) {
      this.logger.warn('Failed to get gas prices, using defaults', { error });
      return {
        maxFeePerGas: '2000000000', // 2 gwei
        maxPriorityFeePerGas: '1000000000', // 1 gwei
      };
    }
  }

  /**
   * Get native token balance for an address
   */
  async getNativeBalance(address: string, chainId: number): Promise<string> {
    try {
      const { publicClient } = this.createClients(chainId);
      const balance = await publicClient.getBalance({
        address: address as Address,
      });

      return (Number(balance) / 1e18).toString(); // Convert wei to ether
    } catch (error) {
      this.logger.error('Failed to get native balance', {
        error,
        address,
        chainId,
      });
      return '0';
    }
  }

  /**
   * Get ERC20 token balance for an address (already implemented)
   */
  async getTokenBalance(
    tokenAddress: string,
    walletAddress: string,
    chainId: number,
  ): Promise<string> {
    return await this.getERC20Balance(tokenAddress, walletAddress, chainId);
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

    // Validate chain support
    if (!this.isChainSupported(transaction.chainId)) {
      errors.push(`Unsupported chain ID: ${transaction.chainId}`);
    }

    // Validate recipient address
    if (!this.isValidAddress(transaction.to)) {
      errors.push(`Invalid recipient address: ${transaction.to}`);
    }

    // Validate amount
    if (!this.isValidAmount(transaction.value)) {
      errors.push(`Invalid amount: ${transaction.value}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Health check for the service (already implemented)
   */
  async healthCheck(chainId?: number): Promise<{
    healthy: boolean;
    latency?: number;
    blockNumber?: number;
    error?: string;
  }> {
    try {
      const targetChainId = chainId || seiTestnet.id;
      const startTime = Date.now();

      const { publicClient } = this.createClients(targetChainId);
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

  // =============================================================================
  // Helper Methods for Interface Implementation
  // =============================================================================

  /**
   * Check if an address is valid
   */
  private isValidAddress(address: string): boolean {
    if (!address || typeof address !== 'string') {
      return false;
    }

    // Basic Ethereum address validation
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    return addressRegex.test(address);
  }

  /**
   * Check if an amount is valid
   */
  private isValidAmount(amount: string): boolean {
    if (!amount && amount !== '0') {
      return false;
    }

    const numValue = parseFloat(amount);
    return !isNaN(numValue) && numValue >= 0;
  }

  /**
   * Get explorer URL for a transaction
   */
  private getExplorerUrl(chainId: number, transactionHash: string): string {
    const chain = this.supportedChains.find((c) => c.id === chainId);
    const baseUrl = chain?.blockExplorers?.default?.url;

    if (!baseUrl) {
      return '';
    }

    return `${baseUrl}/tx/${transactionHash}`;
  }
}
