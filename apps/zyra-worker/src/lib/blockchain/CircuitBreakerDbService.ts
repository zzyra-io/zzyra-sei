import { DatabaseService } from '../../services/database.service';
import { Injectable, Logger } from '@nestjs/common';

export interface CircuitBreakerState {
  id?: string;
  circuitId: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  lastHalfOpenTime?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Circuit Breaker Database Service
 *
 * Handles database operations for circuit breaker state management
 * using Prisma instead of Supabase.
 */
@Injectable()
export class CircuitBreakerDbService {
  private readonly logger = new Logger(CircuitBreakerDbService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Generate circuit ID from service and endpoint
   */
  generateCircuitId(service: string, endpoint: string): string {
    return `${service}:${endpoint}`;
  }

  /**
   * Get circuit breaker state by circuit ID
   */
  async getState(circuitId: string): Promise<CircuitBreakerState | null> {
    try {
      const state =
        await this.databaseService.prisma.circuitBreakerState.findFirst({
          where: { circuitId },
        });

      if (!state) return null;

      return {
        id: state.id,
        circuitId: state.circuitId,
        state: state.state as 'CLOSED' | 'OPEN' | 'HALF_OPEN',
        failureCount: state.failureCount,
        successCount: state.successCount,
        lastFailureTime: state.lastFailureTime,
        lastSuccessTime: state.lastSuccessTime,
        lastHalfOpenTime: state.lastHalfOpenTime,
        createdAt: state.createdAt,
        updatedAt: state.updatedAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get circuit breaker state for ${circuitId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update or create circuit breaker state
   */
  async updateState(
    circuitId: string,
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN',
    failureCount: number,
    successCount: number = 0,
  ): Promise<CircuitBreakerState> {
    try {
      const now = new Date();
      const updateData = {
        state,
        failureCount,
        successCount,
        updatedAt: now,
        ...(state === 'OPEN' && { lastHalfOpenTime: now }),
        ...(failureCount > 0 && { lastFailureTime: now }),
        ...(successCount > 0 && { lastSuccessTime: now }),
      };

      // Try to update existing record
      const existingState =
        await this.databaseService.prisma.circuitBreakerState.findFirst({
          where: { circuitId },
        });

      let result;
      if (existingState) {
        result = await this.databaseService.prisma.circuitBreakerState.update({
          where: { id: existingState.id },
          data: updateData,
        });
      } else {
        // Create new record
        result = await this.databaseService.prisma.circuitBreakerState.create({
          data: {
            circuitId,
            ...updateData,
            createdAt: now,
          },
        });
      }

      return {
        id: result.id,
        circuitId: result.circuitId,
        state: result.state as 'CLOSED' | 'OPEN' | 'HALF_OPEN',
        failureCount: result.failureCount,
        successCount: result.successCount,
        lastFailureTime: result.lastFailureTime,
        lastSuccessTime: result.lastSuccessTime,
        lastHalfOpenTime: result.lastHalfOpenTime,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update circuit breaker state for ${circuitId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Record a successful operation
   */
  async recordSuccess(circuitId: string): Promise<void> {
    try {
      const currentState = await this.getState(circuitId);

      if (currentState) {
        await this.updateState(
          circuitId,
          'CLOSED', // Success always closes the circuit
          0, // Reset failure count
          currentState.successCount + 1,
        );
      } else {
        // Create new circuit in CLOSED state
        await this.updateState(circuitId, 'CLOSED', 0, 1);
      }

      this.logger.log(`Circuit breaker success recorded for ${circuitId}`);
    } catch (error) {
      this.logger.error(
        `Failed to record success for circuit ${circuitId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Record a failed operation
   */
  async recordFailure(circuitId: string, threshold: number = 5): Promise<void> {
    try {
      const currentState = await this.getState(circuitId);
      const newFailureCount = (currentState?.failureCount || 0) + 1;

      // Determine new state based on failure count
      const newState = newFailureCount >= threshold ? 'OPEN' : 'CLOSED';

      await this.updateState(
        circuitId,
        newState,
        newFailureCount,
        currentState?.successCount || 0,
      );

      this.logger.log(
        `Circuit breaker failure recorded for ${circuitId}, failures: ${newFailureCount}, state: ${newState}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to record failure for circuit ${circuitId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Reset circuit breaker state to CLOSED
   */
  async resetState(circuitId: string): Promise<void> {
    try {
      await this.updateState(circuitId, 'CLOSED', 0, 0);
      this.logger.log(`Circuit breaker reset for ${circuitId}`);
    } catch (error) {
      this.logger.error(
        `Failed to reset circuit breaker state for ${circuitId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Check if operation is allowed
   */
  async isOperationAllowed(circuitId: string): Promise<boolean> {
    try {
      const state = await this.getState(circuitId);

      if (!state) {
        // No state exists, allow operation
        return true;
      }

      // Only allow operations if circuit is CLOSED or HALF_OPEN
      return state.state === 'CLOSED' || state.state === 'HALF_OPEN';
    } catch (error) {
      this.logger.error(
        `Failed to check operation allowance for ${circuitId}:`,
        error,
      );
      // Default to allowing operation on error
      return true;
    }
  }

  /**
   * Get all circuit breaker states
   */
  async getAllStates(): Promise<CircuitBreakerState[]> {
    try {
      const states =
        await this.databaseService.prisma.circuitBreakerState.findMany({
          orderBy: { updatedAt: 'desc' },
        });

      return states.map((state) => ({
        id: state.id,
        circuitId: state.circuitId,
        state: state.state as 'CLOSED' | 'OPEN' | 'HALF_OPEN',
        failureCount: state.failureCount,
        successCount: state.successCount,
        lastFailureTime: state.lastFailureTime,
        lastSuccessTime: state.lastSuccessTime,
        lastHalfOpenTime: state.lastHalfOpenTime,
        createdAt: state.createdAt,
        updatedAt: state.updatedAt,
      }));
    } catch (error) {
      this.logger.error('Failed to get all circuit breaker states:', error);
      throw error;
    }
  }

  /**
   * Get circuit breaker state
   */
  async getCircuitState(circuitId: string): Promise<string> {
    try {
      const circuit = await this.databaseService.prisma.circuitBreakerState.findFirst({
        where: { circuitId },
        select: { state: true },
      });

      return circuit?.state || 'CLOSED';
    } catch (error) {
      this.logger.error(`Failed to get circuit state for ${circuitId}:`, error);
      return 'CLOSED'; // Default to CLOSED on error
    }
  }

  /**
   * Get detailed circuit breaker information
   */
  async getCircuitDetails(circuitId: string): Promise<{
    circuitId: string;
    state: string;
    failureCount: number;
    successCount: number;
    lastFailureTime?: Date;
    lastSuccessTime?: Date;
  } | null> {
    try {
      const circuit = await this.databaseService.prisma.circuitBreakerState.findFirst({
        where: { circuitId },
      });

      if (!circuit) {
        return null;
      }

      return {
        circuitId: circuit.circuitId,
        state: circuit.state,
        failureCount: circuit.failureCount,
        successCount: circuit.successCount,
        lastFailureTime: circuit.lastFailureTime,
        lastSuccessTime: circuit.lastSuccessTime,
      };
    } catch (error) {
      this.logger.error(`Failed to get circuit details for ${circuitId}:`, error);
      throw error;
    }
  }

  /**
   * Clean up old circuit breaker states
   */
  async cleanupOldStates(olderThanDays: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result =
        await this.databaseService.prisma.circuitBreakerState.deleteMany({
          where: {
            updatedAt: {
              lt: cutoffDate,
            },
            state: 'CLOSED', // Only cleanup CLOSED states
          },
        });

      this.logger.log(`Cleaned up ${result.count} old circuit breaker states`);
      return result.count;
    } catch (error) {
      this.logger.error('Failed to cleanup circuit breaker states:', error);
      throw error;
    }
  }
}
