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
      // Check database connectivity
      await this.databaseService.healthCheck();

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

      // Worker is unhealthy if failure rate is too high or it's been idle too long
      const isHealthy = failureRate < 50 && !idleTooLong;

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
      await this.databaseService.healthCheck();

      return this.getStatus(key, true, {
        uptime: Date.now() - this.startTime,
        databaseConnected: true,
        message: 'Worker is ready',
      });
    } catch (error) {
      return this.getStatus(key, false, {
        uptime: Date.now() - this.startTime,
        databaseConnected: false,
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
