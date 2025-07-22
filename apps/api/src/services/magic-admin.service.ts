import { Injectable, Logger } from "@nestjs/common";
import { Magic } from "@magic-sdk/admin";
import { ethers } from "ethers";

@Injectable()
export class MagicAdminService {
  private readonly logger = new Logger(MagicAdminService.name);
  private magic: Magic;

  constructor() {
    // Initialize Magic Admin SDK
    this.magic = new Magic(process.env.MAGIC_SECRET_KEY);
  }

  /**
   * Execute transaction through Magic SDK delegation
   */
  async executeTransaction(
    userId: string,
    transaction: any,
    network: string
  ): Promise<{
    txHash: string;
    status: "pending" | "confirmed" | "failed";
  }> {
    try {
      // Get user's Magic session
      const session = await this.magic.users.getMetadataByToken(userId);
      if (!session) {
        throw new Error("Invalid user session");
      }

      // Get user's wallet
      const wallet = await this.magic.wallets.getByUserId(userId);
      if (!wallet) {
        throw new Error("No wallet found for user");
      }

      // Create provider for the network
      const provider = this.getProviderForNetwork(network);

      // Execute transaction through Magic delegation
      const txHash = await this.magic.wallets.sendTransaction({
        userId,
        transaction,
        network,
      });

      // Wait for transaction to be mined
      const receipt = await provider.waitForTransaction(txHash, 1, 60000);

      return {
        txHash,
        status: receipt.status === 1 ? "confirmed" : "failed",
      };
    } catch (error: any) {
      this.logger.error(`Transaction execution failed: ${error.message}`);
      throw new Error(`Transaction execution failed: ${error.message}`);
    }
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(
    userId: string,
    transaction: any
  ): Promise<{
    gasLimit: bigint;
    gasPrice: bigint;
    estimatedCost: bigint;
  }> {
    try {
      // Get user's wallet address
      const wallet = await this.magic.wallets.getByUserId(userId);
      if (!wallet) {
        throw new Error("No wallet found for user");
      }

      // Create provider for estimation
      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

      // Add from address to transaction
      const transactionWithFrom = {
        ...transaction,
        from: wallet.address,
      };

      // Estimate gas limit
      const gasLimit = await provider.estimateGas(transactionWithFrom);

      // Get current gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.parseUnits("1", "gwei");

      // Calculate estimated cost
      const estimatedCost = gasLimit * gasPrice;

      return {
        gasLimit,
        gasPrice,
        estimatedCost,
      };
    } catch (error: any) {
      this.logger.error(`Gas estimation failed: ${error.message}`);
      throw new Error(`Gas estimation failed: ${error.message}`);
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(
    txHash: string,
    confirmations: number = 1,
    timeout: number = 60000
  ): Promise<any> {
    try {
      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
      const receipt = await provider.waitForTransaction(
        txHash,
        confirmations,
        timeout
      );
      return receipt;
    } catch (error: any) {
      this.logger.error(`Transaction confirmation failed: ${error.message}`);
      throw new Error(`Transaction confirmation failed: ${error.message}`);
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(
    txHash: string
  ): Promise<"pending" | "confirmed" | "failed"> {
    try {
      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
      const receipt = await provider.getTransactionReceipt(txHash);

      if (!receipt) {
        return "pending";
      }

      return receipt.status === 1 ? "confirmed" : "failed";
    } catch (error) {
      return "pending";
    }
  }

  /**
   * Get transaction details
   */
  async getTransactionDetails(txHash: string): Promise<any> {
    try {
      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
      const [tx, receipt] = await Promise.all([
        provider.getTransaction(txHash),
        provider.getTransactionReceipt(txHash),
      ]);

      return {
        transaction: tx,
        receipt,
        status: receipt
          ? receipt.status === 1
            ? "confirmed"
            : "failed"
          : "pending",
      };
    } catch (error: any) {
      this.logger.error(`Failed to get transaction details: ${error.message}`);
      throw new Error(`Failed to get transaction details: ${error.message}`);
    }
  }

  /**
   * Request transaction approval from user
   */
  async requestTransactionApproval(
    userId: string,
    transaction: any,
    reason: string
  ): Promise<boolean> {
    try {
      // This would integrate with Magic's approval system
      // For now, we'll simulate approval for low-value transactions
      const estimatedCost = await this.estimateGas(userId, transaction);

      // Auto-approve if estimated cost is low (less than 0.01 ETH)
      const lowValueThreshold = ethers.parseEther("0.01");
      if (estimatedCost.estimatedCost < lowValueThreshold) {
        return true;
      }

      // For high-value transactions, we would trigger Magic's approval flow
      // This is a placeholder for the actual implementation
      this.logger.warn(
        `High-value transaction requires manual approval: ${reason}`
      );
      return false;
    } catch (error: any) {
      this.logger.error(`Approval request failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get provider for specific network
   */
  private getProviderForNetwork(network: string): ethers.JsonRpcProvider {
    const rpcUrls: Record<string, string> = {
      "sei-mainnet":
        process.env.SEI_MAINNET_RPC_URL || process.env.RPC_URL || "",
      "sei-testnet":
        process.env.SEI_TESTNET_RPC_URL || process.env.RPC_URL || "",
      ethereum: process.env.ETHEREUM_RPC_URL || process.env.RPC_URL || "",
      polygon: process.env.POLYGON_RPC_URL || process.env.RPC_URL || "",
      "base-mainnet":
        process.env.BASE_MAINNET_RPC_URL || process.env.RPC_URL || "",
      "base-sepolia":
        process.env.BASE_SEPOLIA_RPC_URL || process.env.RPC_URL || "",
    };

    const rpcUrl = rpcUrls[network] || process.env.RPC_URL;
    if (!rpcUrl) {
      throw new Error(`No RPC URL configured for network: ${network}`);
    }

    return new ethers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Validate user session
   */
  async validateUserSession(userId: string): Promise<boolean> {
    try {
      const session = await this.magic.users.getMetadataByToken(userId);
      return !!session;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user's wallet address
   */
  async getUserWalletAddress(userId: string): Promise<string | null> {
    try {
      const wallet = await this.magic.wallets.getByUserId(userId);
      return wallet?.address || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get user's wallet balance
   */
  async getUserWalletBalance(
    userId: string,
    tokenAddress?: string
  ): Promise<bigint> {
    try {
      const wallet = await this.magic.wallets.getByUserId(userId);
      if (!wallet) {
        throw new Error("No wallet found for user");
      }

      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

      if (tokenAddress) {
        // Get ERC20 token balance
        const tokenContract = new ethers.Contract(
          tokenAddress,
          ["function balanceOf(address) view returns (uint256)"],
          provider
        );
        return await tokenContract.balanceOf(wallet.address);
      } else {
        // Get native balance
        return await provider.getBalance(wallet.address);
      }
    } catch (error: any) {
      this.logger.error(`Failed to get wallet balance: ${error.message}`);
      throw new Error(`Failed to get wallet balance: ${error.message}`);
    }
  }
}
