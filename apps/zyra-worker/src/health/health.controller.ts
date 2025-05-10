import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Gauge } from 'prom-client';
import { QueueHealthIndicator } from '../health/queue.health';
import { WorkerHealthIndicator } from '../health/worker.health';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private queueHealth: QueueHealthIndicator,
    private workerHealth: WorkerHealthIndicator,
    @InjectMetric('worker_health_check_total')
    private healthCheckCounter: Counter<string>,
    @InjectMetric('worker_uptime_seconds') private uptimeGauge: Gauge<string>,
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
}
