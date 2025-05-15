/**
 * Wallet-specific error types
 * 
 * Centralized error handling for the wallet package with custom error classes
 * to provide better error reporting and handling throughout the application.
 */

/**
 * Base error class for wallet-related errors
 */
export class WalletError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'WalletError';
  }
}

/**
 * Error thrown when wallet connection fails
 */
export class ConnectionError extends WalletError {
  constructor(message: string, code = 'wallet/connection-failed') {
    super(message, code);
    this.name = 'ConnectionError';
  }
}

/**
 * Error thrown when wallet is not connected
 */
export class NotConnectedError extends WalletError {
  constructor(message = 'Wallet not connected', code = 'wallet/not-connected') {
    super(message, code);
    this.name = 'NotConnectedError';
  }
}

/**
 * Error thrown when transaction fails
 */
export class TransactionError extends WalletError {
  constructor(
    message: string,
    code = 'wallet/transaction-failed',
    public txHash?: string,
    public rawError?: any
  ) {
    super(message, code);
    this.name = 'TransactionError';
  }
}

/**
 * Error thrown when wallet provider is not supported
 */
export class UnsupportedProviderError extends WalletError {
  constructor(providerType: string) {
    super(`Wallet provider '${providerType}' is not supported`, 'wallet/unsupported-provider');
    this.name = 'UnsupportedProviderError';
  }
}

/**
 * Error thrown when chain is not supported
 */
export class UnsupportedChainError extends WalletError {
  constructor(chainType: string) {
    super(`Chain '${chainType}' is not supported`, 'wallet/unsupported-chain');
    this.name = 'UnsupportedChainError';
  }
}
