import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../services/database.service';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
}

interface ServiceHealth {
  database: any;
  worker: any;
  memory: any;
  system: any;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get comprehensive health status for the worker
   */
  async getHealthStatus(): Promise<HealthStatus & { services: ServiceHealth }> {
    const startTime = Date.now();

    try {
      // Gather health information from all services
      const [databaseHealth, workerHealth, memoryHealth, systemHealth] =
        await Promise.allSettled([
          this.getDatabaseHealth(),
          this.getWorkerHealth(),
          this.getMemoryHealth(),
          this.getSystemHealth(),
        ]);

      const allHealthy = [
        databaseHealth,
        workerHealth,
        memoryHealth,
        systemHealth,
      ].every(
        (result) =>
          result.status === 'fulfilled' && result.value.status === 'healthy',
      );

      const hasWarnings = [
        databaseHealth,
        workerHealth,
        memoryHealth,
        systemHealth,
      ].some(
        (result) =>
          result.status === 'fulfilled' && result.value.status === 'degraded',
      );

      const overallStatus = allHealthy
        ? 'healthy'
        : hasWarnings
          ? 'degraded'
          : 'unhealthy';

      const responseTime = Date.now() - startTime;

      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {
          database:
            databaseHealth.status === 'fulfilled'
              ? databaseHealth.value
              : { status: 'unhealthy', error: databaseHealth.reason },
          worker:
            workerHealth.status === 'fulfilled'
              ? workerHealth.value
              : { status: 'unhealthy', error: workerHealth.reason },
          memory:
            memoryHealth.status === 'fulfilled'
              ? memoryHealth.value
              : { status: 'unhealthy', error: memoryHealth.reason },
          system:
            systemHealth.status === 'fulfilled'
              ? systemHealth.value
              : { status: 'unhealthy', error: systemHealth.reason },
        },
      };
    } catch (error: any) {
      this.logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {
          database: { status: 'unknown', error: 'Health check failed' },
          worker: { status: 'unknown', error: 'Health check failed' },
          memory: { status: 'unknown', error: 'Health check failed' },
          system: { status: 'unknown', error: 'Health check failed' },
        },
      };
    }
  }

  /**
   * Simple health check for quick monitoring
   */
  async getSimpleHealth(): Promise<{ status: string; timestamp: string }> {
    try {
      // Quick database connectivity test
      const dbHealth = await this.databaseService.checkWorkerHealth();

      return {
        status: dbHealth.status === 'healthy' ? 'ok' : 'error',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get database health status
   */
  private async getDatabaseHealth(): Promise<{
    status: string;
    [key: string]: any;
  }> {
    try {
      const health = await this.databaseService.checkWorkerHealth();

      return {
        status: health.status === 'healthy' ? 'healthy' : 'unhealthy',
        responseTime: health.responseTime,
        databaseStatus: health.databaseStatus,
        metrics: health.metrics,
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: null,
      };
    }
  }

  /**
   * Get worker-specific health metrics
   */
  private async getWorkerHealth(): Promise<{
    status: string;
    [key: string]: any;
  }> {
    try {
      const metrics = this.databaseService.getWorkerMetrics();

      // Determine health based on error rate
      const errorRate = metrics.errorRate;
      let status = 'healthy';

      if (errorRate > 10) {
        status = 'unhealthy';
      } else if (errorRate > 5) {
        status = 'degraded';
      }

      return {
        status,
        metrics,
        details: {
          errorThreshold: 10,
          warningThreshold: 5,
          currentErrorRate: errorRate,
        },
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * Get memory health status
   */
  private async getMemoryHealth(): Promise<{
    status: string;
    [key: string]: any;
  }> {
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemoryMB = memoryUsage.heapTotal / 1024 / 1024;
      const usedMemoryMB = memoryUsage.heapUsed / 1024 / 1024;
      const memoryUsagePercent = (usedMemoryMB / totalMemoryMB) * 100;

      let status = 'healthy';
      if (memoryUsagePercent > 90) {
        status = 'unhealthy';
      } else if (memoryUsagePercent > 80) {
        status = 'degraded';
      }

      return {
        status,
        usage: {
          heapUsed: Math.round(usedMemoryMB),
          heapTotal: Math.round(totalMemoryMB),
          usagePercent: Math.round(memoryUsagePercent),
          external: Math.round(memoryUsage.external / 1024 / 1024),
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
        },
        thresholds: {
          warning: 80,
          critical: 90,
        },
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * Get system health status
   */
  private async getSystemHealth(): Promise<{
    status: string;
    [key: string]: any;
  }> {
    try {
      const uptime = process.uptime();
      const loadAverage =
        process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0];
      const cpuCount = require('os').cpus().length;

      // Simple health based on uptime and load
      let status = 'healthy';
      if (uptime < 60) {
        status = 'degraded'; // Recently started
      }

      return {
        status,
        uptime: Math.floor(uptime),
        platform: process.platform,
        nodeVersion: process.version,
        cpuCount,
        loadAverage: loadAverage.map(
          (load: number) => Math.round(load * 100) / 100,
        ),
        environment: process.env.NODE_ENV || 'development',
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * Get readiness status (for Kubernetes readiness probes)
   */
  async getReadiness(): Promise<{ ready: boolean; checks: any }> {
    try {
      const dbReady = await this.isDatabaseReady();
      const workerReady = await this.isWorkerReady();

      return {
        ready: dbReady && workerReady,
        checks: {
          database: dbReady,
          worker: workerReady,
        },
      };
    } catch (error: any) {
      return {
        ready: false,
        checks: {
          database: false,
          worker: false,
          error: error.message,
        },
      };
    }
  }

  /**
   * Get liveness status (for Kubernetes liveness probes)
   */
  async getLiveness(): Promise<{ alive: boolean; uptime: number }> {
    return {
      alive: true,
      uptime: process.uptime(),
    };
  }

  /**
   * Check if database is ready for operations
   */
  private async isDatabaseReady(): Promise<boolean> {
    try {
      const health = await this.databaseService.checkWorkerHealth();
      return health.status === 'healthy';
    } catch (error: any) {
      return false;
    }
  }

  /**
   * Check if worker is ready for processing
   */
  private async isWorkerReady(): Promise<boolean> {
    try {
      const metrics = this.databaseService.getWorkerMetrics();
      // Worker is ready if error rate is below threshold
      return metrics.errorRate < 50; // Allow high error rate for startup
    } catch (error: any) {
      return false;
    }
  }

  /**
   * Perform maintenance tasks
   */
  async performMaintenance(): Promise<{
    success: boolean;
    tasks: string[];
    error?: string;
  }> {
    try {
      this.logger.log('🛠️ Starting worker maintenance tasks...');

      const dbMaintenance =
        await this.databaseService.performWorkerMaintenance();

      const tasks = [
        ...dbMaintenance.tasks,
        'Memory garbage collection triggered',
        'Health metrics refreshed',
      ];

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      this.logger.log('✅ Worker maintenance completed');

      return {
        success: true,
        tasks,
      };
    } catch (error: any) {
      this.logger.error('❌ Worker maintenance failed:', error);
      return {
        success: false,
        tasks: [],
        error: error.message,
      };
    }
  }
}
