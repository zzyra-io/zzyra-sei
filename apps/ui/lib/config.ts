// Centralized configuration
export const config = {
  retry: {
    attempts: Number(process.env.RETRY_LIMIT || 3),
    factor: Number(process.env.RETRY_BACKOFF_FACTOR || 2),
    minTimeout: Number(process.env.RETRY_MIN_TIMEOUT || 1000),
  },
  concurrency: {
    prefetch: Number(process.env.PREFETCH_COUNT || 1),
  },
};
