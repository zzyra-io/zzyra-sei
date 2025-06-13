import { Injectable, Logger } from '@nestjs/common';
import { Magic } from '@magic-sdk/admin';

/**
 * Service for interacting with Magic Link's Admin SDK
 * Provides functionality for server-side wallet operations
 */
@Injectable()
export class MagicAdminService {
  private readonly logger = new Logger(MagicAdminService.name);
  private magic: Magic;

  constructor() {
    // Initialize Magic Admin SDK with secret key
    const secretKey = process.env.MAGIC_SECRET_KEY;
    if (!secretKey) {
      this.logger.warn(
        'MAGIC_SECRET_KEY environment variable is not set, some functionality may be limited',
      );
    }

    try {
      this.magic = new Magic(secretKey);
      this.logger.log('Magic Admin SDK initialized');
    } catch (error) {
      this.logger.error(`Failed to initialize Magic Admin SDK: ${error}`);
      throw error;
    }
  }

  /**
   * Validate a DID token from Magic SDK
   * @param didToken The DID token to validate
   * @returns The validated token data
   */
  async validateToken(didToken: string) {
    try {
      this.logger.debug('Validating Magic DID token');

      // Validate the token
      await this.magic.token.validate(didToken);

      // Get issuer from token
      const issuer = this.magic.token.getIssuer(didToken);

      // Get public address from token
      const publicAddress = this.magic.token.getPublicAddress(didToken);

      return { issuer, publicAddress };
    } catch (error) {
      this.logger.error(`Token validation failed: ${error}`);
      throw error;
    }
  }

  /**
   * Get user metadata by issuer ID
   * @param issuer The user's Magic issuer ID
   * @returns User metadata including wallet information
   */
  async getUserMetadata(issuer: string) {
    try {
      this.logger.debug(`Getting user metadata for issuer: ${issuer}`);
      return await this.magic.users.getMetadataByIssuer(issuer);
    } catch (error) {
      this.logger.error(`Failed to get user metadata: ${error}`);
      throw error;
    }
  }

  /**
   * Get user's wallet information for a specific blockchain
   * @param issuer The user's Magic issuer ID
   * @param walletType The type of wallet to retrieve (e.g., 'ETH')
   * @returns Wallet information including public address
   */
  async getUserWallet(issuer: string, walletType: string) {
    try {
      this.logger.debug(`Getting ${walletType} wallet for issuer: ${issuer}`);
      const metadata = await this.magic.users.getMetadataByIssuer(issuer);

      // Find the wallet of the specified type
      const wallet = metadata.wallets?.find(
        (w) => w.walletType.toLowerCase() === walletType.toLowerCase(),
      );

      if (!wallet) {
        throw new Error(`No ${walletType} wallet found for user`);
      }

      return wallet;
    } catch (error) {
      this.logger.error(`Failed to get user wallet: ${error}`);
      throw error;
    }
  }
}
