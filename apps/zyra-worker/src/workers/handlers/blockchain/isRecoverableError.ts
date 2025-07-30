/**
 * Utility function to determine if a blockchain error is recoverable and should be retried
 */
export function isRecoverableError(error: any): boolean {
  // Extract error message
  const errorMessage =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  // List of common recoverable errors
  const recoverableErrors = [
    'timeout',
    'network error',
    'connection refused',
    'server responded with a status of 429',
    'too many requests',
    'rate limit',
    'nonce too low',
    'replacement transaction underpriced',
    'already known',
    'gas price too low',
    'insufficient funds for gas',
    'connection reset',
    'not found',
    'gateway timeout',
    'unknown transaction',
  ];

  // Check if error message contains any recoverable patterns
  return recoverableErrors.some((pattern) => errorMessage.includes(pattern));
}
