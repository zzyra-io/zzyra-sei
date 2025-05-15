/**
 * Wallet service implementing application-specific business logic
 * related to persisted wallet data. Client-side, makes API calls to the backend.
 */

import {
  WalletType,
  ChainType,
  Wallet as CoreWallet,
  WalletTransaction as CoreWalletTransaction,
} from "../core/types";
// import type { WalletRepository } from "../repository/wallet.repository"; // Removed
// import type { WalletTransactionCreateInput } from "@zyra/database"; // No longer directly needed

/**
 * Transaction status types (can be shared with wagmi or domain specific)
 */
export type TransactionStatus = "pending" | "success" | "failed";

const API_BASE_PATH = "/api/zyra"; // Example base path for your API routes

/**
 * Service for wallet data operations. Makes API calls to the backend.
 */
export class WalletService {
  constructor() {
    // No repository needed in constructor for client-side service
  }

  private async fetchApi<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${API_BASE_PATH}${endpoint}`, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: "API request failed with status: " + response.status,
      }));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }
    return response.json();
  }

  async saveOrUpdateWallet(
    userId: string,
    address: string,
    chainId: number,
    walletType: WalletType,
    chainType: ChainType
  ): Promise<CoreWallet> {
    return this.fetchApi<CoreWallet>("/wallet/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, address, chainId, walletType, chainType }),
    });
  }

  async getUserPersistedWallets(userId: string): Promise<CoreWallet[]> {
    return this.fetchApi<CoreWallet[]>(`/wallets/user/${userId}`);
  }

  async recordTransaction(
    userId: string,
    walletAddress: string,
    txHash: string,
    from: string,
    to: string,
    value: string,
    status: TransactionStatus,
    txType: string,
    chainId: number
  ): Promise<CoreWalletTransaction> {
    return this.fetchApi<CoreWalletTransaction>("/transactions/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        walletAddress,
        txHash,
        fromAddress: from,
        toAddress: to,
        amount: value,
        status,
        type: txType,
        chainId,
      }),
    });
  }

  async getPersistedWalletTransactions(
    walletAddress: string,
    limit: number = 10
  ): Promise<CoreWalletTransaction[]> {
    return this.fetchApi<CoreWalletTransaction[]>(
      `/transactions/wallet/${walletAddress}?limit=${limit}`
    );
  }

  async getUserPersistedTransactions(
    userId: string,
    limit: number = 10
  ): Promise<CoreWalletTransaction[]> {
    return this.fetchApi<CoreWalletTransaction[]>(
      `/transactions/user/${userId}?limit=${limit}`
    );
  }

  async getPersistedWalletByAddress(
    address: string
  ): Promise<CoreWallet | null> {
    // API needs to handle null case correctly (e.g., 404 which fetchApi might throw or return specific structure)
    try {
      return await this.fetchApi<CoreWallet | null>(
        `/wallet/address/${address}`
      );
    } catch (error: any) {
      if (error.message && error.message.includes("404")) return null; // Example: handle 404 as null
      throw error;
    }
  }

  async updatePersistedTransactionStatus(
    txHash: string,
    status: TransactionStatus
  ): Promise<CoreWalletTransaction | null> {
    try {
      return await this.fetchApi<CoreWalletTransaction | null>(
        "/transactions/status",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ txHash, status }),
        }
      );
    } catch (error: any) {
      if (error.message && error.message.includes("404")) return null; // Example: handle 404 as null
      throw error;
    }
  }

  // Deprecated method - remove or update if it was used elsewhere significantly
  // async saveWalletToDatabase(...) { ... }
}
