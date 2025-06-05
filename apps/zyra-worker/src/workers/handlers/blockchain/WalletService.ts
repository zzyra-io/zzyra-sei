import { Injectable, Logger } from '@nestjs/common';
import { Wallet } from 'ethers';
import { DatabaseService } from '../../../services/database.service';

/**
 * Service for managing blockchain wallets
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private wallets: Map<number, Wallet> = new Map();

  constructor(private readonly databaseService: DatabaseService) {
    this.initializeWallets();
  }

  /**
   * Initialize wallets from environment variables
   */
  private initializeWallets(): void {
    // Get all environment variables for wallet private keys
    // Format: CHAIN_<ID>_PRIVATE_KEY
    const envVars = process.env;
    const privateKeyRegex = /^CHAIN_(\d+)_PRIVATE_KEY$/;

    // Default Ethereum wallet from ETHEREUM_PRIVATE_KEY
    const defaultPrivateKey = process.env.ETHEREUM_PRIVATE_KEY;
    if (defaultPrivateKey) {
      try {
        const wallet = new Wallet(defaultPrivateKey);
        this.wallets.set(1, wallet); // Ethereum mainnet is chain ID 1
        this.logger.log(
          `Initialized wallet for Ethereum mainnet (chain ID: 1)`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to initialize Ethereum mainnet wallet: ${error}`,
        );
      }
    }

    // Load additional wallets from environment
    for (const key in envVars) {
      const match = key.match(privateKeyRegex);
      if (match && match[1]) {
        const chainId = parseInt(match[1], 10);
        const privateKey = envVars[key];

        if (privateKey) {
          try {
            const wallet = new Wallet(privateKey);
            this.wallets.set(chainId, wallet);
            this.logger.log(`Initialized wallet for chain ID: ${chainId}`);
          } catch (error) {
            this.logger.error(
              `Failed to initialize wallet for chain ID ${chainId}: ${error}`,
            );
          }
        }
      }
    }
  }

  /**
   * Get the wallet for a specific chain
   */
  async get(chainId: number): Promise<Wallet | undefined> {
    return this.wallets.get(chainId);
  }

  /**
   * Save wallet data securely in the database
   */
  async saveWalletData(
    userId: string,
    chainId: number,
    address: string,
  ): Promise<void> {
    try {
      // Check if wallet exists for this user and network
      const existingWallet =
        await this.databaseService.prisma.userWallet.findFirst({
          where: {
            userId,
            chainId: chainId.toString(),
          },
        });

      if (existingWallet) {
        // Update existing wallet
        await this.databaseService.prisma.userWallet.update({
          where: { id: existingWallet.id },
          data: {
            walletAddress: address,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new wallet entry
        await this.databaseService.prisma.userWallet.create({
          data: {
            userId,
            chainId: chainId.toString(),
            walletAddress: address,
            walletType: 'smart_wallet',
            chainType: 'ethereum',
          },
        });
      }

      this.logger.log(
        `Wallet data saved for user ${userId} on chain ${chainId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to save wallet data: ${error}`);
      throw error;
    }
  }
}
