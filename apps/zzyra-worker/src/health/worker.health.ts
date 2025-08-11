import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { DatabaseService } from '../services/database.service';

type ErrorWithMessage = Error & {
  message: string;
  stack?: string;
};

@Injectable()
export class WorkerHealthIndicator extends HealthIndicator {
  private startTime: number;
  private lastSuccessfulExecution: number;
  private executionCount: number = 0;
  private failureCount: number = 0;

  constructor(private readonly databaseService: DatabaseService) {
    super();
    this.startTime = Date.now();
    this.lastSuccessfulExecution = 0;
  }

  recordExecution(success: boolean) {
    this.executionCount++;
    if (success) {
      this.lastSuccessfulExecution = Date.now();
    } else {
      this.failureCount++;
    }
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Check database connectivity with enhanced monitoring
      const dbHealthResult = await this.databaseService.healthCheck();

      // Calculate health metrics
      const uptime = Date.now() - this.startTime;
      const executionRate = this.executionCount / (uptime / 60000); // executions per minute
      const failureRate =
        this.executionCount > 0
          ? (this.failureCount / this.executionCount) * 100
          : 0;

      // Check if the worker has processed any jobs recently (if it's been running for a while)
      const idleTooLong =
        uptime > 300000 && // Running for more than 5 minutes
        this.lastSuccessfulExecution > 0 && // Has processed at least one job
        Date.now() - this.lastSuccessfulExecution > 600000; // No successful job in 10 minutes

      // Worker is unhealthy if failure rate is too high, idle too long, or database is unhealthy
      const databaseHealthy = dbHealthResult.isHealthy;
      const isHealthy = failureRate < 50 && !idleTooLong && databaseHealthy;

      return this.getStatus(key, isHealthy, {
        uptime,
        executionCount: this.executionCount,
        failureCount: this.failureCount,
        failureRate: failureRate.toFixed(2) + '%',
        executionRate: executionRate.toFixed(2) + '/min',
        lastSuccessfulExecution: this.lastSuccessfulExecution
          ? new Date(this.lastSuccessfulExecution).toISOString()
          : 'never',
        idleTooLong,
        database: {
          healthy: databaseHealthy,
          responseTime: dbHealthResult.responseTime,
          lastError: dbHealthResult.lastError,
        },
      });
    } catch (error) {
      return this.getStatus(key, false, {
        message: `Worker health check failed: ${(error as ErrorWithMessage).message}`,
        error: (error as ErrorWithMessage).stack,
      });
    }
  }

  async isReady(key: string): Promise<HealthIndicatorResult> {
    // For readiness, we just need to make sure the worker is running and connected to the database
    try {
      const dbHealthResult = await this.databaseService.healthCheck();
      const isReady = dbHealthResult.isHealthy;

      return this.getStatus(key, isReady, {
        uptime: Date.now() - this.startTime,
        database: {
          connected: dbHealthResult.isHealthy,
          responseTime: dbHealthResult.responseTime,
          lastError: dbHealthResult.lastError,
        },
        message: isReady
          ? 'Worker is ready'
          : 'Worker not ready - database issues',
      });
    } catch (error) {
      return this.getStatus(key, false, {
        uptime: Date.now() - this.startTime,
        database: {
          connected: false,
          error: (error as ErrorWithMessage).message,
        },
        message: `Readiness check failed: ${(error as ErrorWithMessage).message}`,
      });
    }
  }

  async isAlive(key: string): Promise<HealthIndicatorResult> {
    // For liveness, we just need to know the worker process is responsive
    return this.getStatus(key, true, {
      uptime: Date.now() - this.startTime,
    });
  }
}
