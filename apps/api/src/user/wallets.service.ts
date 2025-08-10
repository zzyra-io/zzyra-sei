import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { WalletRepository } from "@zzyra/database";
import {
  CreateWalletDto,
  WalletResponseDto,
  WalletTransactionResponseDto,
} from "./dto/user.dto";

@Injectable()
export class WalletsService {
  constructor(private readonly walletRepository: WalletRepository) {}

  async getUserWallets(userId: string): Promise<WalletResponseDto[]> {
    const wallets = await this.walletRepository.findByUserId(userId);

    return wallets.map((wallet) => ({
      id: wallet.id,
      userId: wallet.userId,
      walletAddress: wallet.walletAddress,
      chainId: wallet.chainId,
      walletType: wallet.walletType || "unknown",
      chainType: wallet.chainType || "evm",
      metadata: (wallet.metadata as Record<string, any>) || {},
      createdAt: wallet.createdAt.toISOString(),
      updatedAt: wallet.updatedAt.toISOString(),
    }));
  }

  async createWallet(
    userId: string,
    createData: CreateWalletDto
  ): Promise<WalletResponseDto> {
    try {
      // Check if wallet already exists
      const existingWallet = await this.walletRepository.findByAddress(
        createData.walletAddress
      );

      if (existingWallet && existingWallet.userId !== userId) {
        throw new ConflictException(
          "This wallet is already connected to another account"
        );
      }

      if (existingWallet && existingWallet.userId === userId) {
        // Update existing wallet
        const updatedWallet = await this.walletRepository.saveWallet(
          userId,
          createData.walletAddress,
          createData.chainId,
          createData.walletType || "unknown",
          createData.chainType || "evm"
        );

        return {
          id: updatedWallet.id,
          userId: updatedWallet.userId,
          walletAddress: updatedWallet.walletAddress,
          chainId: updatedWallet.chainId,
          walletType: updatedWallet.walletType || "unknown",
          chainType: updatedWallet.chainType || "evm",
          metadata: (updatedWallet.metadata as Record<string, any>) || {},
          createdAt: updatedWallet.createdAt.toISOString(),
          updatedAt: updatedWallet.updatedAt.toISOString(),
        };
      }

      // Create new wallet
      const wallet = await this.walletRepository.saveWallet(
        userId,
        createData.walletAddress,
        createData.chainId,
        createData.walletType || "unknown",
        createData.chainType || "evm"
      );

      return {
        id: wallet.id,
        userId: wallet.userId,
        walletAddress: wallet.walletAddress,
        chainId: wallet.chainId,
        walletType: wallet.walletType || "unknown",
        chainType: wallet.chainType || "evm",
        metadata: (wallet.metadata as Record<string, any>) || {},
        createdAt: wallet.createdAt.toISOString(),
        updatedAt: wallet.updatedAt.toISOString(),
      };
    } catch (error: any) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new Error(`Failed to save wallet: ${error.message}`);
    }
  }

  async deleteWallet(
    userId: string,
    walletId: string
  ): Promise<{ success: boolean; walletId: string }> {
    // Find wallet to verify ownership
    const wallet = await this.walletRepository.findById(walletId);

    if (!wallet) {
      throw new NotFoundException("Wallet not found");
    }

    if (wallet.userId !== userId) {
      throw new NotFoundException("Wallet not found or not owned by user");
    }

    // Delete wallet
    await this.walletRepository.delete(walletId);

    return { success: true, walletId };
  }

  async getWalletTransactions(
    userId: string,
    walletAddress?: string,
    limit = 10
  ): Promise<WalletTransactionResponseDto[]> {
    let transactions;

    if (walletAddress) {
      // Verify user owns this wallet
      const wallet = await this.walletRepository.findByAddress(walletAddress);
      if (!wallet || wallet.userId !== userId) {
        throw new NotFoundException("Wallet not found or access denied");
      }

      transactions =
        await this.walletRepository.findTransactionsByWalletAddress(
          walletAddress,
          { take: limit }
        );
    } else {
      transactions = await this.walletRepository.findTransactionsByUserId(
        userId,
        limit
      );
    }

    return transactions.map((tx) => ({
      id: tx.id,
      userId: tx.userId,
      walletAddress: tx.walletAddress,
      transactionHash: tx.txHash,
      chainId: tx.chainId.toString(),
      type: "transaction",
      amount: tx.value,
      symbol: "ETH",
      metadata: {},
      createdAt: tx.createdAt.toISOString(),
    }));
  }
}
