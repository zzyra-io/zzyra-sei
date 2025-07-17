import { Injectable, Logger } from '@nestjs/common';
import {
  prisma,
  ExecutionRepository,
  WorkflowRepository,
  UserRepository,
  NotificationRepository,
} from '@zyra/database';
import {
  prisma as defaultPrisma,
  createDevelopmentExtensionManager,
  createProductionExtensionManager,
  createExtendedPrismaClient,
  DatabaseCacheProvider,
  DatabaseRateLimitStore,
} from '@zyra/database';

interface WorkerMetrics {
  totalOperations: number;
  failedOperations: number;
  retryOperations: number;
  averageResponseTime: number;
  lastError?: string;
  lastErrorTime?: Date;
}

/**
 * Enhanced Database Service for Zyra Worker
 *
 * This service provides access to database repositories with enhanced monitoring,
 * retry logic, and performance tracking specifically designed for worker processes.
 */
@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);
  private workerMetrics: WorkerMetrics = {
    totalOperations: 0,
    failedOperations: 0,
    retryOperations: 0,
    averageResponseTime: 0,
  };

  // Repository instances from @zyra/database
  public readonly executions = new ExecutionRepository();
  public readonly workflows = new WorkflowRepository();
  public readonly users = new UserRepository();
  public readonly notifications = new NotificationRepository();

  // Enhanced Prisma client access
  public readonly prisma: typeof defaultPrisma;

  constructor() {
    let extendedClient = defaultPrisma;
    try {
      const isProd = process.env.NODE_ENV === 'production';
      const extensionManager = isProd
        ? createProductionExtensionManager({
            userId: undefined, // Optionally set userId if available
            cacheProvider: new DatabaseCacheProvider(defaultPrisma),
            rateLimitStore: new DatabaseRateLimitStore(defaultPrisma),
          })
        : createDevelopmentExtensionManager();
      extendedClient = createExtendedPrismaClient(
        defaultPrisma,
        extensionManager,
      );
      this.logger.log(
        '✅ DatabaseService using extended Prisma client with extensions',
      );
    } catch (err) {
      this.logger.warn(
        '⚠️ Failed to initialize Prisma extensions, using default client',
        err,
      );
    }
    this.prisma = extendedClient;
    this.logger.log('🔧 DatabaseService initialized with enhanced monitoring');
  }

  /**
   * Execute database operation with retry logic and monitoring
   */
  async executeWithRetry<T>(
    operationName: string,
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoffMs: number = 1000,
  ): Promise<T> {
    const start = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.workerMetrics.totalOperations++;

        const result = await operation();

        // Update metrics on success
        const duration = Date.now() - start;
        this.updateMetrics(duration, false, attempt > 1);

        if (attempt > 1) {
          this.logger.log(
            `✅ ${operationName} succeeded on attempt ${attempt}`,
          );
        }

        return result;
      } catch (error: any) {
        lastError = error;

        if (attempt === maxRetries) {
          // Final attempt failed
          this.workerMetrics.failedOperations++;
          this.workerMetrics.lastError = error.message;
          this.workerMetrics.lastErrorTime = new Date();

          this.logger.error(
            `❌ ${operationName} failed after ${maxRetries} attempts`,
            error,
          );
          break;
        }

        // Calculate backoff with jitter
        const jitter = Math.random() * 0.1 * backoffMs;
        const delay = backoffMs * Math.pow(2, attempt - 1) + jitter;

        this.logger.warn(
          `⚠️ ${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${Math.round(delay)}ms`,
          error.message,
        );

        await this.sleep(delay);
        this.workerMetrics.retryOperations++;
      }
    }

    throw lastError;
  }

  /**
   * Get or create user profile with enhanced error handling
   */
  async getOrCreateUserProfile(userId: string) {
    return this.executeWithRetry('getOrCreateUserProfile', async () => {
      let profile = await this.prisma.profile.findUnique({
        where: { id: userId },
      });

      if (!profile) {
        // Create profile if it doesn't exist
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw new Error(`User ${userId} not found`);
        }

        profile = await this.prisma.profile.create({
          data: {
            id: userId,
            email: user.email,
            subscriptionTier: 'free',
            subscriptionStatus: 'inactive',
            monthlyExecutionQuota: 100,
            monthlyExecutionCount: 0,
          },
        });

        this.logger.log(`👤 Created profile for user ${userId}`);
      }

      return profile;
    });
  }

  /**
   * Update execution status with enhanced logging and monitoring
   */
  async updateExecutionStatusWithLogging(
    executionId: string,
    status: string,
    error?: string,
    output?: any,
  ): Promise<any> {
    return this.executeWithRetry('updateExecutionStatus', async () => {
      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'completed') {
        updateData.finishedAt = new Date();
        if (output) updateData.output = output;
      }

      if (status === 'failed') {
        updateData.finishedAt = new Date();
        if (error) updateData.error = error;
      }

      const execution = await this.prisma.workflowExecution.update({
        where: { id: executionId },
        data: updateData,
      });

      // Log the status change
      await this.prisma.executionLog.create({
        data: {
          executionId,
          level: status === 'failed' ? 'error' : 'info',
          message: `Execution status changed to ${status}`,
          metadata: {
            previousStatus: execution.status,
            newStatus: status,
            error: error || null,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return execution;
    });
  }

  /**
   * Batch execute multiple operations with error isolation
   */
  async safeBatchExecute<T>(
    operations: Array<{ name: string; operation: () => Promise<T> }>,
  ): Promise<Array<{ success: boolean; result?: T; error?: string }>> {
    const results = [];

    for (const { name, operation } of operations) {
      try {
        const result = await this.executeWithRetry(name, operation, 2, 500);
        results.push({ success: true, result });
      } catch (error: any) {
        results.push({ success: false, error: error.message });
        this.logger.error(`Batch operation ${name} failed:`, error);
      }
    }

    return results;
  }

  /**
   * Health check specifically for worker operations
   */
  async checkWorkerHealth(): Promise<{
    status: string;
    metrics: WorkerMetrics;
    databaseStatus: string;
    responseTime: number;
  }> {
    const start = Date.now();

    try {
      // Test database connectivity
      await this.prisma.$queryRaw`SELECT 1`;

      // Test basic operations
      await this.prisma.workflowExecution.count();

      const responseTime = Date.now() - start;

      return {
        status: 'healthy',
        metrics: this.workerMetrics,
        databaseStatus: 'connected',
        responseTime,
      };
    } catch (error: any) {
      const responseTime = Date.now() - start;

      return {
        status: 'unhealthy',
        metrics: this.workerMetrics,
        databaseStatus: 'disconnected',
        responseTime,
      };
    }
  }

  /**
   * Health check alias for compatibility with health indicators
   */
  async healthCheck(): Promise<{
    isHealthy: boolean;
    responseTime: number;
    lastError?: string;
  }> {
    const workerHealth = await this.checkWorkerHealth();

    return {
      isHealthy: workerHealth.status === 'healthy',
      responseTime: workerHealth.responseTime,
      lastError:
        workerHealth.status !== 'healthy'
          ? workerHealth.databaseStatus
          : undefined,
    };
  }

  /**
   * Lock execution for a specific worker to prevent concurrent processing
   */
  async lockExecutionForWorker(
    executionId: string,
    workerId: string,
  ): Promise<void> {
    return this.executeWithRetry('lockExecutionForWorker', async () => {
      // Try to update the execution with worker ID if it's not already locked
      const updated = await this.prisma.workflowExecution.updateMany({
        where: {
          id: executionId,
          AND: [
            {
              OR: [
                { lockedBy: null },
                { lockedBy: workerId }, // Allow same worker to re-claim
              ],
            },
            {
              status: {
                in: ['pending', 'running'], // Only lock executions that can be processed
              },
            },
          ],
        },
        data: {
          lockedBy: workerId,
          updatedAt: new Date(),
        },
      });

      if (updated.count === 0) {
        throw new Error(
          `Failed to lock execution ${executionId} - already locked by another worker or not in processable state`,
        );
      }

      this.logger.log(
        `🔒 Execution ${executionId} locked by worker ${workerId}`,
      );
    });
  }

  /**
   * Clean up old data for worker maintenance
   */
  async performWorkerMaintenance(): Promise<{
    success: boolean;
    tasks: string[];
    error?: string;
  }> {
    try {
      this.logger.log('🛠️ Starting worker maintenance...');
      const tasks = [];

      // Clean up old execution logs (older than 24 hours for workers)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const deletedLogs = await this.prisma.executionLog.deleteMany({
        where: {
          timestamp: { lt: oneDayAgo },
          level: { not: 'error' }, // Keep error logs longer
        },
      });
      tasks.push(`Cleaned up ${deletedLogs.count} old execution logs`);

      // Reset metrics if they're getting too large
      if (this.workerMetrics.totalOperations > 10000) {
        this.resetMetrics();
        tasks.push('Reset worker metrics');
      }

      this.logger.log('✅ Worker maintenance completed', tasks);
      return { success: true, tasks };
    } catch (error: any) {
      this.logger.error('❌ Worker maintenance failed', error);
      return { success: false, tasks: [], error: error.message };
    }
  }

  /**
   * Get worker performance metrics
   */
  getWorkerMetrics() {
    return {
      ...this.workerMetrics,
      errorRate:
        this.workerMetrics.totalOperations > 0
          ? (this.workerMetrics.failedOperations /
              this.workerMetrics.totalOperations) *
            100
          : 0,
      retryRate:
        this.workerMetrics.totalOperations > 0
          ? (this.workerMetrics.retryOperations /
              this.workerMetrics.totalOperations) *
            100
          : 0,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };
  }

  /**
   * Reset worker metrics
   */
  resetMetrics() {
    this.workerMetrics = {
      totalOperations: 0,
      failedOperations: 0,
      retryOperations: 0,
      averageResponseTime: 0,
    };
    this.logger.log('📊 Worker metrics reset');
  }

  /**
   * Update internal metrics
   */
  private updateMetrics(duration: number, failed: boolean, isRetry: boolean) {
    // Update average response time
    this.workerMetrics.averageResponseTime =
      (this.workerMetrics.averageResponseTime + duration) / 2;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
