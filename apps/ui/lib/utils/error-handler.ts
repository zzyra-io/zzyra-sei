"use client";

/**
 * Centralized error handling for workflow builder operations
 * Provides consistent error handling, logging, and recovery mechanisms
 */
export class WorkflowError extends Error {
  constructor(
    message: string,
    public code: string,
    public meta?: Record<string, any>,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = "WorkflowError";
    
    // Log to console in development
    if (process.env.NODE_ENV !== "production") {
      console.error(`[${code}] ${message}`, meta);
    }
    
    // In production, send to monitoring service
    if (process.env.NODE_ENV === "production") {
      captureWorkflowError(this);
    }
  }
}

// Error codes for different workflow operation types
export const ErrorCodes = {
  CANVAS: {
    NODE_OPERATION_FAILED: "CANVAS_NODE_OPERATION_FAILED",
    EDGE_OPERATION_FAILED: "CANVAS_EDGE_OPERATION_FAILED",
    RENDER_ERROR: "CANVAS_RENDER_ERROR",
  },
  STORE: {
    STATE_UPDATE_FAILED: "STORE_STATE_UPDATE_FAILED",
    PERSISTENCE_ERROR: "STORE_PERSISTENCE_ERROR",
    HISTORY_ERROR: "STORE_HISTORY_ERROR",
  },
  API: {
    LOAD_FAILED: "API_LOAD_FAILED",
    SAVE_FAILED: "API_SAVE_FAILED",
    EXECUTION_FAILED: "API_EXECUTION_FAILED",
    PERMISSION_DENIED: "API_PERMISSION_DENIED",
    NETWORK_ERROR: "API_NETWORK_ERROR",
  },
  VALIDATION: {
    INVALID_WORKFLOW: "VALIDATION_INVALID_WORKFLOW",
    MISSING_CONFIG: "VALIDATION_MISSING_CONFIG",
    DISCONNECTED_NODES: "VALIDATION_DISCONNECTED_NODES",
  },
};

/**
 * Retry utility for async operations with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    retries?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    retries = 3,
    initialDelay = 500,
    maxDelay = 10000,
    factor = 2,
    onRetry,
  } = options;

  let attempt = 0;
  let delay = initialDelay;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      attempt++;
      
      if (attempt >= retries) {
        throw error;
      }
      
      if (onRetry) {
        onRetry(attempt, error as Error);
      }
      
      delay = Math.min(delay * factor, maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Optimistic update with rollback
 */
export function withOptimisticUpdate<T, U>(
  update: (data: T) => T,
  commit: (data: T) => Promise<U>,
  rollback: (original: T) => void,
  data: T
): Promise<U> {
  const original = JSON.parse(JSON.stringify(data));
  const updated = update(data);
  
  return commit(updated).catch(error => {
    rollback(original);
    throw error;
  });
}

/**
 * Production error monitoring integration
 */
function captureWorkflowError(error: WorkflowError): void {
  // In production, this would send the error to a monitoring service like Sentry
  console.error("[MONITORING]", error.code, error.message, error.meta);
  
  // TODO: Replace with actual error reporting service
  // Example with Sentry:
  // Sentry.captureException(error, {
  //   tags: { code: error.code },
  //   extra: error.meta
  // });
}
