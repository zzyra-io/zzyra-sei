import { Injectable, Logger } from '@nestjs/common';
import {
  prisma,
  ExecutionRepository,
  WorkflowRepository,
  UserRepository,
  NotificationRepository,
} from '@zyra/database';

/**
 * Database Service for Zzyra Worker
 *
 * This service provides access to database repositories from the @zyra/database package.
 * It acts as a facade for the worker's database operations.
 */
@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  // Repository instances from @zyra/database
  public readonly executions = new ExecutionRepository();
  public readonly workflows = new WorkflowRepository();
  public readonly users = new UserRepository();
  public readonly notifications = new NotificationRepository();

  // Direct Prisma client access for complex operations
  public readonly prisma: typeof prisma = prisma;

  constructor() {
    this.logger.log(
      'DatabaseService initialized with repositories from @zyra/database',
    );
  }

  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Worker-specific helper methods that use the repositories
   */

  /**
   * Get pending executions for worker processing
   */
  async getPendingExecutionsForWorker(limit = 10): Promise<any[]> {
    try {
      return await this.executions.getPendingExecutions(limit);
    } catch (error) {
      this.logger.error('Failed to get pending executions:', error);
      throw error;
    }
  }

  /**
   * Lock execution for worker processing
   */
  async lockExecutionForWorker(
    executionId: string,
    workerId: string,
  ): Promise<any> {
    try {
      return await this.executions.lockExecution(executionId, workerId);
    } catch (error) {
      this.logger.error(`Failed to lock execution ${executionId}:`, error);
      throw error;
    }
  }

  /**
   * Update execution status with logging
   */
  async updateExecutionStatusWithLogging(
    executionId: string,
    status: any,
    result?: any,
    error?: string,
  ): Promise<any> {
    try {
      const execution = await this.executions.updateStatus(
        executionId,
        status,
        error,
      );

      // Add log entry
      await this.executions.addLog(
        executionId,
        status === 'failed' ? 'error' : 'info',
        `Execution status updated to ${status}`,
        { result, error },
      );

      return execution;
    } catch (err) {
      this.logger.error(`Failed to update execution ${executionId}:`, err);
      throw err;
    }
  }

  /**
   * Get or create user profile with error handling
   */
  async getOrCreateUserProfile(userId: string): Promise<any> {
    try {
      const profile = await this.users.findById(userId);
      if (!profile) {
        return await this.users.create({
          id: userId,
        });
      }
      return profile;
    } catch (error) {
      this.logger.error(`Failed to get/create user profile ${userId}:`, error);
      throw error;
    }
  }
}
