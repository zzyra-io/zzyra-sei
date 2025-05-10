import { Injectable, Logger } from '@nestjs/common';

/**
 * CircuitBreaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation, transactions allowed
  OPEN = 'OPEN',     // Circuit is open, transactions blocked
  HALF_OPEN = 'HALF_OPEN' // Testing if the system has recovered
}

/**
 * Configuration for circuit breaker behavior
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;       // Number of failures before opening circuit
  resetTimeout: number;           // Time in ms before attempting reset (half-open)
  halfOpenSuccessThreshold: number; // Successful ops needed to close circuit
  monitorWindow: number;          // Time window in ms to track failures
  maxRetries: number;             // Max number of retries per operation
  retryBackoffMs: number;         // Base backoff time between retries
}

/**
 * Default configuration values
 */
export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
  halfOpenSuccessThreshold: 2,
  monitorWindow: 120000, // 2 minutes
  maxRetries: 3,
  retryBackoffMs: 1000, // 1 second
};

/**
 * CircuitBreaker implementation for blockchain transactions
 * 
 * Prevents cascading failures by tracking errors and stopping further
 * operations when a predefined threshold is reached.
 */
@Injectable()
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successesInHalfOpen: number = 0;
  private lastFailureTime: number = 0;
  private resetTimer: NodeJS.Timeout | null = null;
  private readonly circuitBreakers: Map<string, CircuitState> = new Map();
  private readonly failureCounts: Map<string, number> = new Map();
  private readonly successCounts: Map<string, number> = new Map();
  private readonly lastFailureTimes: Map<string, number> = new Map();
  private readonly resetTimers: Map<string, NodeJS.Timeout> = new Map();
  
  private readonly logger = new Logger(CircuitBreaker.name);
  
  constructor(private readonly config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG) {}

  /**
   * Get the current state of a specific circuit
   */
  getState(circuitId: string): CircuitState {
    return this.circuitBreakers.get(circuitId) || CircuitState.CLOSED;
  }

  /**
   * Checks if operations are allowed for a specific circuit
   */
  isAllowed(circuitId: string): boolean {
    const state = this.getState(circuitId);
    
    if (state === CircuitState.CLOSED) {
      return true;
    }
    
    if (state === CircuitState.HALF_OPEN) {
      // In half-open state, allow limited transactions to test recovery
      return true;
    }
    
    // Open state - check if it's time to try half-open
    const lastFailure = this.lastFailureTimes.get(circuitId) || 0;
    const timeSinceFailure = Date.now() - lastFailure;
    
    if (timeSinceFailure >= this.config.resetTimeout) {
      this.transitionToHalfOpen(circuitId);
      return true;
    }
    
    return false;
  }

  /**
   * Record a successful operation
   */
  recordSuccess(circuitId: string): void {
    const state = this.getState(circuitId);
    
    if (state === CircuitState.HALF_OPEN) {
      // Increment success counter in half-open state
      const successes = (this.successCounts.get(circuitId) || 0) + 1;
      this.successCounts.set(circuitId, successes);
      
      if (successes >= this.config.halfOpenSuccessThreshold) {
        this.closeCircuit(circuitId);
      }
    }
    
    // In CLOSED state, reset failure count
    if (state === CircuitState.CLOSED) {
      this.failureCounts.set(circuitId, 0);
    }
  }

  /**
   * Record a failed operation
   */
  recordFailure(circuitId: string): void {
    const state = this.getState(circuitId);
    const now = Date.now();
    
    // Update last failure time
    this.lastFailureTimes.set(circuitId, now);
    
    if (state === CircuitState.HALF_OPEN) {
      // Any failure in half-open immediately opens the circuit
      this.openCircuit(circuitId);
      return;
    }
    
    if (state === CircuitState.CLOSED) {
      // Check if old failures should be reset based on monitor window
      const lastFailureTime = this.lastFailureTimes.get(circuitId) || 0;
      const timeSinceLastFailure = now - lastFailureTime;
      
      if (timeSinceLastFailure > this.config.monitorWindow) {
        // Reset counter if we're outside the monitoring window
        this.failureCounts.set(circuitId, 1);
      } else {
        // Increment failure counter
        const failures = (this.failureCounts.get(circuitId) || 0) + 1;
        this.failureCounts.set(circuitId, failures);
        
        // Check threshold
        if (failures >= this.config.failureThreshold) {
          this.openCircuit(circuitId);
        }
      }
    }
  }

  /**
   * Calculate exponential backoff time for retries
   */
  getRetryBackoff(attempt: number): number {
    return Math.min(
      this.config.retryBackoffMs * Math.pow(2, attempt),
      30000 // Max 30 seconds
    );
  }

  /**
   * Transition circuit to OPEN state
   */
  private openCircuit(circuitId: string): void {
    this.logger.warn(`Opening circuit breaker for ${circuitId}`);
    this.circuitBreakers.set(circuitId, CircuitState.OPEN);
    this.successCounts.set(circuitId, 0);
    
    // Clear any existing reset timer
    const existingTimer = this.resetTimers.get(circuitId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set timer to transition to half-open
    const timer = setTimeout(() => {
      this.transitionToHalfOpen(circuitId);
    }, this.config.resetTimeout);
    
    this.resetTimers.set(circuitId, timer);
  }

  /**
   * Transition circuit to HALF_OPEN state
   */
  private transitionToHalfOpen(circuitId: string): void {
    this.logger.log(`Moving circuit breaker to half-open state for ${circuitId}`);
    this.circuitBreakers.set(circuitId, CircuitState.HALF_OPEN);
    this.successCounts.set(circuitId, 0);
  }

  /**
   * Transition circuit to CLOSED state
   */
  private closeCircuit(circuitId: string): void {
    this.logger.log(`Closing circuit breaker for ${circuitId}`);
    this.circuitBreakers.set(circuitId, CircuitState.CLOSED);
    this.failureCounts.set(circuitId, 0);
    this.successCounts.set(circuitId, 0);
  }

  /**
   * Reset a specific circuit breaker
   */
  reset(circuitId: string): void {
    this.logger.log(`Manually resetting circuit breaker for ${circuitId}`);
    this.closeCircuit(circuitId);
    
    // Clear any scheduled timer
    const existingTimer = this.resetTimers.get(circuitId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.resetTimers.delete(circuitId);
    }
  }
}
