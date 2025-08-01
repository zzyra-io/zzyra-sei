import { ethers } from 'ethers';
import { validateSeiAddress } from '@zyra/types';
import {
  http,
  createWalletClient,
  createPublicClient,
  parseEther,
  formatEther,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Sei Network configuration
const seiTestnet = {
  id: 1328,
  name: 'Sei Testnet',
  network: 'sei-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'SEI',
    symbol: 'SEI',
  },
  rpcUrls: {
    default: {
      http: ['https://evm-rpc-testnet.sei-apis.com'],
    },
    public: {
      http: ['https://evm-rpc-testnet.sei-apis.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Seitrace',
      url: 'https://seitrace.com',
    },
  },
  testnet: true,
} as const;

/**
 * Sei Wallet Service for direct transaction execution using viem
 * Uses private key for signing transactions directly on Sei Network
 */
export class SeiWalletService {
  private walletClient: any;
  private publicClient: any;
  private account: any;

  constructor(private provider?: ethers.JsonRpcProvider) {
    // Create account from private key
    this.account = privateKeyToAccount(
      process.env.WALLET_PRIVATE_KEY as `0x${string}`,
    );

    // Create wallet client for transaction signing
    this.walletClient = createWalletClient({
      account: this.account,
      transport: http(
        process.env.RPC_PROVIDER_URL || seiTestnet.rpcUrls.default.http[0],
      ),
      chain: seiTestnet,
    });

    // Create public client for reading blockchain data
    this.publicClient = createPublicClient({
      transport: http(
        process.env.RPC_PROVIDER_URL || seiTestnet.rpcUrls.default.http[0],
      ),
      chain: seiTestnet,
    });
  }

  /**
   * Execute transaction directly on Sei Network using wallet client
   * Signs and sends transaction using the configured private key
   */
  async delegateTransaction(
    userId: string,
    transaction: any,
    network: string,
  ): Promise<{
    txHash: string;
    status: 'pending' | 'confirmed' | 'failed';
  }> {
    try {
      console.log(`Executing transaction for user ${userId} on ${network}`);

      // Validate transaction parameters
      this.validateTransaction(transaction);

      // Convert addresses if needed (sei1... to 0x...)
      const toAddress = this.convertAddressFormat(transaction.to);

      // Prepare transaction parameters
      const txParams: any = {
        to: toAddress,
        value: transaction.value || 0n,
        data: transaction.data || '0x',
      };

      // Add gas parameters if provided
      if (transaction.gasLimit) {
        txParams.gas = BigInt(transaction.gasLimit);
      }
      if (transaction.gasPrice) {
        txParams.gasPrice = BigInt(transaction.gasPrice);
      }

      // Send the transaction
      const hash = await this.walletClient.sendTransaction(txParams);

      console.log(`Transaction sent with hash: ${hash}`);

      return {
        txHash: hash,
        status: 'pending',
      };
    } catch (error: any) {
      console.error('Transaction execution failed:', error);
      throw new Error(`Transaction execution failed: ${error.message}`);
    }
  }

  /**
   * Get the wallet address (returns the configured wallet address)
   * In direct wallet mode, all operations use the same wallet
   */
  async getUserWalletAddress(userId: string): Promise<string> {
    console.log(`Getting wallet address for user ${userId}`);
    return this.account.address;
  }

  /**
   * Get wallet balance directly from Sei Network
   */
  async getUserWalletBalance(
    userId: string,
    tokenAddress?: string,
  ): Promise<bigint> {
    try {
      console.log(`Getting balance for user ${userId}, token: ${tokenAddress}`);

      if (tokenAddress) {
        // For ERC20 tokens, we'd need to call the contract
        // For now, throw an error as this requires contract interaction
        throw new Error('ERC20 token balance checking not yet implemented');
      } else {
        // Get native SEI balance
        const balance = await this.publicClient.getBalance({
          address: this.account.address,
        });

        console.log(`Balance: ${balance} wei`);
        return balance;
      }
    } catch (error: any) {
      console.error('Failed to get wallet balance:', error);
      throw new Error(`Failed to get wallet balance: ${error.message}`);
    }
  }

  /**
   * Check if user has sufficient balance for transaction
   */
  async checkSufficientBalance(
    userId: string,
    requiredAmount: bigint,
    tokenAddress?: string,
  ): Promise<boolean> {
    try {
      const balance = await this.getUserWalletBalance(userId, tokenAddress);
      return balance >= requiredAmount;
    } catch (error) {
      return false;
    }
  }

  /**
   * Estimate gas for transaction using direct wallet operations
   */
  async estimateGasForUser(
    userId: string,
    transaction: any,
  ): Promise<{
    gasLimit: bigint;
    gasPrice: bigint;
    estimatedCost: bigint;
  }> {
    try {
      console.log(`Estimating gas for user ${userId}`);

      // Convert address format if needed
      const toAddress = this.convertAddressFormat(transaction.to);

      // Prepare transaction for gas estimation
      const txParams: any = {
        account: this.account,
        to: toAddress,
        value: transaction.value || 0n,
        data: transaction.data || '0x',
      };

      // Estimate gas limit
      const gasLimit = await this.publicClient.estimateGas(txParams);

      // Get current gas price
      const gasPrice = await this.publicClient.getGasPrice();

      const estimatedCost = BigInt(gasLimit) * BigInt(gasPrice);

      console.log(
        `Gas estimate - Limit: ${gasLimit}, Price: ${gasPrice}, Cost: ${estimatedCost}`,
      );

      return {
        gasLimit: BigInt(gasLimit),
        gasPrice: BigInt(gasPrice),
        estimatedCost,
      };
    } catch (error: any) {
      console.error('Failed to estimate gas:', error);
      throw new Error(`Failed to estimate gas: ${error.message}`);
    }
  }

  /**
   * Validate transaction parameters
   */
  validateTransaction(transaction: any): void {
    if (!transaction.to) {
      throw new Error('Transaction must have a recipient address (to)');
    }

    if (!validateSeiAddress(transaction.to)) {
      throw new Error(
        'Invalid Sei recipient address. Must be either sei1... (Cosmos) or 0x... (EVM)',
      );
    }

    if (transaction.value && typeof transaction.value !== 'bigint') {
      throw new Error('Transaction value must be a bigint');
    }

    if (transaction.gasLimit && typeof transaction.gasLimit !== 'bigint') {
      throw new Error('Gas limit must be a bigint');
    }

    if (transaction.gasPrice && typeof transaction.gasPrice !== 'bigint') {
      throw new Error('Gas price must be a bigint');
    }

    if (transaction.data && typeof transaction.data !== 'string') {
      throw new Error('Transaction data must be a string');
    }
  }

  /**
   * Wait for transaction confirmation using direct wallet operations
   */
  async waitForTransaction(
    txHash: string,
    confirmations: number = 1,
    timeout: number = 60000,
  ): Promise<any> {
    try {
      console.log(
        `Waiting for transaction ${txHash} with ${confirmations} confirmations`,
      );

      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`,
        confirmations,
        timeout,
      });

      console.log(
        `Transaction ${txHash} confirmed in block ${receipt.blockNumber}`,
      );

      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 'success' ? 'confirmed' : 'failed',
        from: receipt.from,
        to: receipt.to,
        effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
      };
    } catch (error: any) {
      console.error('Transaction confirmation failed:', error);
      throw new Error(`Transaction confirmation failed: ${error.message}`);
    }
  }

  /**
   * Get transaction status using direct blockchain query
   */
  async getTransactionStatus(
    txHash: string,
  ): Promise<'pending' | 'confirmed' | 'failed'> {
    try {
      console.log(`Getting status for transaction ${txHash}`);

      const receipt = await this.publicClient.getTransactionReceipt({
        hash: txHash as `0x${string}`,
      });

      if (receipt) {
        return receipt.status === 'success' ? 'confirmed' : 'failed';
      } else {
        return 'pending';
      }
    } catch (error) {
      console.warn(`Could not get transaction status for ${txHash}:`, error);
      return 'pending';
    }
  }

  /**
   * Get transaction details using direct blockchain query
   */
  async getTransactionDetails(txHash: string): Promise<any> {
    try {
      console.log(`Getting details for transaction ${txHash}`);

      const [transaction, receipt] = await Promise.all([
        this.publicClient.getTransaction({ hash: txHash as `0x${string}` }),
        this.publicClient
          .getTransactionReceipt({ hash: txHash as `0x${string}` })
          .catch(() => null),
      ]);

      return {
        hash: transaction.hash,
        from: transaction.from,
        to: transaction.to,
        value: transaction.value.toString(),
        gasLimit: transaction.gas?.toString(),
        gasPrice: transaction.gasPrice?.toString(),
        data: transaction.input,
        nonce: transaction.nonce,
        blockNumber: transaction.blockNumber?.toString(),
        blockHash: transaction.blockHash,
        transactionIndex: transaction.transactionIndex,
        status: receipt
          ? receipt.status === 'success'
            ? 'confirmed'
            : 'failed'
          : 'pending',
        gasUsed: receipt?.gasUsed?.toString(),
        effectiveGasPrice: receipt?.effectiveGasPrice?.toString(),
        receipt,
      };
    } catch (error: any) {
      console.error('Failed to get transaction details:', error);
      throw new Error(`Failed to get transaction details: ${error.message}`);
    }
  }

  /**
   * Request transaction approval from user
   * In direct wallet mode, we auto-approve for demo purposes
   * In production, this should integrate with a user approval system
   */
  async requestTransactionApproval(
    userId: string,
    transaction: any,
    reason: string,
  ): Promise<boolean> {
    console.log(`Auto-approving transaction for user ${userId}: ${reason}`);
    console.log('Transaction details:', transaction);

    // For demo purposes, auto-approve all transactions
    // In production, this should show a UI approval dialog or similar
    return true;
  }

  /**
   * Get user session info
   * In direct wallet mode, we simulate a valid session
   */
  async getUserSession(userId: string): Promise<any> {
    console.log(`Getting session for user ${userId}`);

    // Simulate a valid session for direct wallet mode
    return {
      userId,
      walletAddress: this.account.address,
      isValid: true,
      chainId: seiTestnet.id,
      network: 'sei-testnet',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validate user session
   * In direct wallet mode, always return true for demo purposes
   */
  async validateUserSession(userId: string): Promise<boolean> {
    console.log(`Validating session for user ${userId}`);
    // For direct wallet mode, always consider the session valid
    return true;
  }

  /**
   * Convert address format from sei1... to 0x... if needed
   * For Sei Network, we primarily work with 0x addresses for EVM compatibility
   */
  private convertAddressFormat(address: string): string {
    if (!address) {
      throw new Error('Address is required');
    }

    // If already in 0x format, return as-is
    if (address.startsWith('0x')) {
      return address;
    }

    // If in sei1 format, we'd need proper bech32 decoding
    // For now, just validate and pass through - full conversion requires bech32 library
    if (address.startsWith('sei1')) {
      // For demo purposes, just validate it looks like a proper sei1 address
      if (address.length >= 39 && address.length <= 59) {
        return address; // Pass through sei1 addresses as-is for now
      } else {
        throw new Error(`Invalid sei1 address format: ${address}`);
      }
    }

    throw new Error(
      `Unsupported address format: ${address}. Use 0x... or sei1... format`,
    );
  }
}
