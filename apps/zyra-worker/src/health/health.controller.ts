import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Gauge } from 'prom-client';
import { QueueHealthIndicator } from '../health/queue.health';
import { WorkerHealthIndicator } from '../health/worker.health';
import { DatabaseService } from '../services/database.service';
import { RabbitMQService } from '../services/rabbitmq.service';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private queueHealth: QueueHealthIndicator,
    private workerHealth: WorkerHealthIndicator,
    @InjectMetric('worker_health_check_total')
    private healthCheckCounter: Counter<string>,
    @InjectMetric('worker_uptime_seconds') private uptimeGauge: Gauge<string>,
    private readonly databaseService: DatabaseService,
    private readonly rabbitmqService: RabbitMQService,
  ) {
    // Update uptime every 60 seconds
    setInterval(() => {
      this.uptimeGauge.set(process.uptime());
    }, 60000);
  }

  @Get()
  @HealthCheck()
  check() {
    this.healthCheckCounter.inc(1);
    return this.health.check([
      async () => this.queueHealth.isHealthy('rabbitmq'),
      async () => this.workerHealth.isHealthy('execution_worker'),
    ]);
  }

  @Get('readiness')
  @HealthCheck()
  readiness() {
    return this.health.check([
      async () => this.queueHealth.isHealthy('rabbitmq'),
      async () => this.workerHealth.isReady('execution_worker'),
    ]);
  }

  @Get('liveness')
  @HealthCheck()
  liveness() {
    return this.health.check([
      async () => this.workerHealth.isAlive('execution_worker'),
    ]);
  }

  @Get('rabbitmq')
  async checkRabbitMQ() {
    const queueStats = await this.rabbitmqService.getQueueStats();
    const isHealthy = this.rabbitmqService.isConnectionHealthy();

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      connection: isHealthy ? 'connected' : 'disconnected',
      queues: queueStats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('database')
  async checkDatabase() {
    const isHealthy = await this.databaseService.healthCheck();

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('metrics')
  async getMetrics() {
    const queueStats = await this.rabbitmqService.getQueueStats();
    const performanceMetrics =
      await this.rabbitmqService.getPerformanceMetrics();
    const dbHealthy = await this.databaseService.healthCheck();

    return {
      timestamp: new Date().toISOString(),
      queues: queueStats,
      performance: performanceMetrics,
      database: {
        status: dbHealthy ? 'healthy' : 'unhealthy',
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid,
      },
    };
  }

  @Get('scaling')
  async getScalingInfo() {
    const queueStats = await this.rabbitmqService.getQueueStats();
    const performanceMetrics =
      await this.rabbitmqService.getPerformanceMetrics();

    return {
      current_load: {
        pending_messages:
          queueStats?.[process.env.EXECUTION_QUEUE || 'execution-queue']
            ?.messageCount || 0,
        active_consumers:
          queueStats?.[process.env.EXECUTION_QUEUE || 'execution-queue']
            ?.consumerCount || 0,
        retry_queue_size:
          queueStats?.[
            process.env.EXECUTION_RETRY_QUEUE || 'execution-retry-queue'
          ]?.messageCount || 0,
        failed_messages:
          queueStats?.[process.env.EXECUTION_DLQ || 'execution-dlq']
            ?.messageCount || 0,
      },
      recommendations: queueStats?.recommendations || [],
      scaling_suggestions: {
        recommended_workers:
          performanceMetrics?.scaling?.recommended_workers || 1,
        current_workers: performanceMetrics?.scaling?.current_consumers || 1,
        action_needed: this.determineScalingAction(
          queueStats,
          performanceMetrics,
        ),
      },
      capacity: {
        queue_utilization:
          performanceMetrics?.capacity?.utilization_percentage || 0,
        estimated_throughput:
          performanceMetrics?.throughput?.estimated_messages_per_second || 0,
        max_capacity: performanceMetrics?.capacity?.max_queue_length || 100000,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private determineScalingAction(
    queueStats: any,
    performanceMetrics: any,
  ): string {
    const messageCount =
      queueStats?.[process.env.EXECUTION_QUEUE || 'execution-queue']
        ?.messageCount || 0;
    const utilization =
      performanceMetrics?.capacity?.utilization_percentage || 0;

    if (messageCount > 100000 || utilization > 80) {
      return 'SCALE_UP_URGENT';
    } else if (messageCount > 50000 || utilization > 60) {
      return 'SCALE_UP_RECOMMENDED';
    } else if (messageCount < 1000 && utilization < 10) {
      return 'SCALE_DOWN_POSSIBLE';
    }
    return 'MAINTAIN_CURRENT';
  }
}
