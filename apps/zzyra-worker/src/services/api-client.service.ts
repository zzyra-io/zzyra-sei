import { Injectable, Logger } from '@nestjs/common';

export interface SessionKeyApiResponse {
  id: string;
  walletAddress: string;
  parentWalletAddress: string;
  smartWalletOwner: string;
  chainId: string;
  sessionPublicKey: string;
  encryptedPrivateKey: string;
  validUntil: string;
  permissions: Array<{
    operation: string;
    maxAmountPerTx: string;
    maxDailyAmount: string;
    allowedContracts: string[];
  }>;
  parentDelegationSignature: string;
}

/**
 * API Client Service for Worker
 * Handles communication with the main API for session keys and other resources
 */
@Injectable()
export class ApiClientService {
  private readonly logger = new Logger(ApiClientService.name);
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
  }

  /**
   * Get session key data from the API
   */
  async getSessionKey(sessionKeyId: string): Promise<SessionKeyApiResponse> {
    try {
      this.logger.log('Fetching session key from API', {
        sessionKeyId: sessionKeyId.substring(0, 8) + '...',
        apiUrl: this.baseUrl,
      });

      const response = await fetch(
        `${this.baseUrl}/api/session-keys/${sessionKeyId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // Add worker authentication headers if needed
            'User-Agent': 'Zzyra-Worker/1.0',
          },
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Session key not found: ${sessionKeyId}`);
        }
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(`API error: ${data.error || 'Unknown error'}`);
      }

      this.logger.log('Session key fetched successfully from API', {
        sessionKeyId: sessionKeyId.substring(0, 8) + '...',
      });

      return data.data;
    } catch (error) {
      this.logger.error('Failed to fetch session key from API', {
        sessionKeyId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Decrypt session key private key using the API's crypto service
   */
  async decryptSessionKey(
    encryptedPrivateKey: string,
    userSignature: string,
  ): Promise<string> {
    try {
      this.logger.log('Decrypting session key via API');

      const response = await fetch(`${this.baseUrl}/api/session-keys/decrypt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Zzyra-Worker/1.0',
        },
        body: JSON.stringify({
          encryptedPrivateKey,
          userSignature,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Decryption request failed: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(`Decryption error: ${data.error || 'Unknown error'}`);
      }

      this.logger.log('Session key decrypted successfully');
      return data.privateKey;
    } catch (error) {
      this.logger.error('Failed to decrypt session key', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
