import { Injectable, Logger } from '@nestjs/common';
import { CircuitBreakerDbService } from '../lib/blockchain/CircuitBreakerDbService';

export interface CircuitBreakerLevel {
  level: 'workflow' | 'user' | 'api' | 'global';
  circuitId: string;
  priority: number; // Higher priority checked first
}

export interface ExecutionContext {
  workflowId?: string;
  userId?: string;
  executionId?: string;
  nodeId?: string;
  blockType?: string;
  apiEndpoint?: string;
}

@Injectable()
export class MultiLevelCircuitBreakerService {
  private readonly logger = new Logger(MultiLevelCircuitBreakerService.name);

  constructor(
    private readonly circuitBreakerDbService: CircuitBreakerDbService,
  ) {}

  /**
   * Generate circuit breaker levels for Zzyra's multi-level strategy
   */
  private generateCircuitLevels(
    context: ExecutionContext,
  ): CircuitBreakerLevel[] {
    const levels: CircuitBreakerLevel[] = [];

    // Validate context
    if (!context) {
      this.logger.warn(
        'ExecutionContext is undefined, using global circuit breaker only',
      );
      levels.push({
        level: 'global',
        circuitId: 'global:workflow-execution',
        priority: 1,
      });
      return levels;
    }

    // 1. Per-Workflow Circuit Breaker (Highest Priority)
    if (context.workflowId) {
      levels.push({
        level: 'workflow',
        circuitId: `workflow:${context.workflowId}`,
        priority: 4,
      });
    } else {
      this.logger.warn('workflowId is undefined in ExecutionContext');
    }

    // 2. Per-User Circuit Breaker
    if (context.userId) {
      levels.push({
        level: 'user',
        circuitId: `user:${context.userId}`,
        priority: 3,
      });
    } else {
      this.logger.warn('userId is undefined in ExecutionContext');
    }

    // 3. Per-API Circuit Breaker (if API endpoint is involved)
    if (context.apiEndpoint) {
      levels.push({
        level: 'api',
        circuitId: `api:${context.apiEndpoint}`,
        priority: 2,
      });
    }

    // 4. Global Circuit Breaker (Lowest Priority)
    levels.push({
      level: 'global',
      circuitId: 'global:workflow-execution',
      priority: 1,
    });

    // Sort by priority (highest first)
    return levels.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Check if execution should be allowed through all circuit breaker levels
   */
  async shouldAllowExecution(context: ExecutionContext): Promise<{
    allowed: boolean;
    blockedBy?: CircuitBreakerLevel;
    reason?: string;
  }> {
    const levels = this.generateCircuitLevels(context);

    for (const level of levels) {
      try {
        const state = await this.circuitBreakerDbService.getCircuitState(
          level.circuitId,
        );

        if (state === 'OPEN') {
          this.logger.warn(
            `Execution blocked by ${level.level} circuit breaker: ${level.circuitId}`,
          );

          return {
            allowed: false,
            blockedBy: level,
            reason: `${level.level} circuit breaker is OPEN`,
          };
        }

        this.logger.debug(
          `${level.level} circuit breaker ${level.circuitId}: ${state}`,
        );
      } catch (error) {
        this.logger.error(
          `Error checking ${level.level} circuit breaker ${level.circuitId}:`,
          error,
        );
        // Continue checking other levels if one fails
      }
    }

    return { allowed: true };
  }

  /**
   * Record success across all relevant circuit breaker levels
   */
  async recordSuccess(context: ExecutionContext): Promise<void> {
    const levels = this.generateCircuitLevels(context);

    await Promise.allSettled(
      levels.map(async (level) => {
        try {
          await this.circuitBreakerDbService.recordSuccess(level.circuitId);
          this.logger.debug(
            `Recorded success for ${level.level} circuit breaker: ${level.circuitId}`,
          );
        } catch (error) {
          this.logger.error(
            `Error recording success for ${level.level} circuit breaker ${level.circuitId}:`,
            error,
          );
        }
      }),
    );
  }

  /**
   * Record failure across all relevant circuit breaker levels
   */
  async recordFailure(context: ExecutionContext, error: Error): Promise<void> {
    const levels = this.generateCircuitLevels(context);

    // Classify the error to determine which levels should be affected
    const affectedLevels = this.classifyErrorImpact(error, levels);

    await Promise.allSettled(
      affectedLevels.map(async (level) => {
        try {
          await this.circuitBreakerDbService.recordFailure(level.circuitId);
          this.logger.debug(
            `Recorded failure for ${level.level} circuit breaker: ${level.circuitId}`,
          );
        } catch (dbError) {
          this.logger.error(
            `Error recording failure for ${level.level} circuit breaker ${level.circuitId}:`,
            dbError,
          );
        }
      }),
    );
  }

  /**
   * Classify error impact to determine which circuit breaker levels should be affected
   */
  private classifyErrorImpact(
    error: Error,
    levels: CircuitBreakerLevel[],
  ): CircuitBreakerLevel[] {
    const errorMessage = error.message.toLowerCase();
    const affectedLevels: CircuitBreakerLevel[] = [];

    // User configuration errors - affect workflow and user levels
    if (
      errorMessage.includes('required') ||
      errorMessage.includes('configuration') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('missing')
    ) {
      affectedLevels.push(
        ...levels.filter((l) => l.level === 'workflow' || l.level === 'user'),
      );
    }
    // API/Network errors - affect API and potentially global levels
    else if (
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('api')
    ) {
      affectedLevels.push(
        ...levels.filter((l) => l.level === 'api' || l.level === 'global'),
      );
    }
    // System errors - affect global level
    else if (
      errorMessage.includes('database') ||
      errorMessage.includes('internal') ||
      errorMessage.includes('system') ||
      errorMessage.includes('unavailable')
    ) {
      affectedLevels.push(...levels.filter((l) => l.level === 'global'));
    }
    // Unknown errors - affect workflow level only (most conservative)
    else {
      affectedLevels.push(...levels.filter((l) => l.level === 'workflow'));
    }

    return affectedLevels;
  }

  /**
   * Get circuit breaker status for all levels
   */
  async getCircuitStatus(context: ExecutionContext): Promise<
    Record<
      string,
      {
        level: string;
        circuitId: string;
        state: string;
        failureCount: number;
        lastFailureTime?: Date;
      }
    >
  > {
    const levels = this.generateCircuitLevels(context);
    const status: Record<string, any> = {};

    await Promise.allSettled(
      levels.map(async (level) => {
        try {
          const [state, details] = await Promise.all([
            this.circuitBreakerDbService.getCircuitState(level.circuitId),
            this.circuitBreakerDbService.getCircuitDetails(level.circuitId),
          ]);

          status[level.level] = {
            level: level.level,
            circuitId: level.circuitId,
            state,
            failureCount: details?.failureCount || 0,
            lastFailureTime: details?.lastFailureTime,
          };
        } catch (error) {
          this.logger.error(
            `Error getting status for ${level.level} circuit breaker:`,
            error,
          );
          status[level.level] = {
            level: level.level,
            circuitId: level.circuitId,
            state: 'ERROR',
            failureCount: -1,
          };
        }
      }),
    );

    return status;
  }

  /**
   * Force open a circuit breaker at a specific level
   */
  async forceOpen(circuitId: string, reason: string): Promise<void> {
    this.logger.warn(
      `Force opening circuit breaker: ${circuitId}, reason: ${reason}`,
    );

    try {
      // Record multiple failures to trigger OPEN state
      await this.circuitBreakerDbService.recordFailure(circuitId);
      await this.circuitBreakerDbService.recordFailure(circuitId);
      await this.circuitBreakerDbService.recordFailure(circuitId);
      await this.circuitBreakerDbService.recordFailure(circuitId);
      await this.circuitBreakerDbService.recordFailure(circuitId);
    } catch (error) {
      this.logger.error(
        `Error force opening circuit breaker ${circuitId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Force close a circuit breaker at a specific level
   */
  async forceClose(circuitId: string, reason: string): Promise<void> {
    this.logger.warn(
      `Force closing circuit breaker: ${circuitId}, reason: ${reason}`,
    );

    try {
      // Record multiple successes to trigger CLOSED state
      await this.circuitBreakerDbService.recordSuccess(circuitId);
      await this.circuitBreakerDbService.recordSuccess(circuitId);
      await this.circuitBreakerDbService.recordSuccess(circuitId);
    } catch (error) {
      this.logger.error(
        `Error force closing circuit breaker ${circuitId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Generate specific circuit IDs for different contexts
   */
  generateCircuitId(
    type: 'workflow' | 'user' | 'api' | 'global',
    identifier: string,
  ): string {
    switch (type) {
      case 'workflow':
        return `workflow:${identifier}`;
      case 'user':
        return `user:${identifier}`;
      case 'api':
        return `api:${identifier}`;
      case 'global':
        return 'global:workflow-execution';
      default:
        throw new Error(`Unknown circuit breaker type: ${type}`);
    }
  }

  /**
   * Clean up old circuit breaker states (maintenance)
   */
  async cleanup(olderThanDays: number = 7): Promise<void> {
    this.logger.log(
      `Cleaning up circuit breaker states older than ${olderThanDays} days`,
    );

    try {
      await this.circuitBreakerDbService.cleanupOldStates(olderThanDays);
      this.logger.log('Circuit breaker cleanup completed successfully');
    } catch (error) {
      this.logger.error('Error during circuit breaker cleanup:', error);
      throw error;
    }
  }
}
