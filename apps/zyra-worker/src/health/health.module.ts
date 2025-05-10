import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { QueueHealthIndicator } from './queue.health';
import { WorkerHealthIndicator } from './worker.health';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { RABBITMQ_HEALTH_PROVIDER } from './health.constants';
import { getOrCreateCounter, getOrCreateGauge } from '../lib/prometheus';

@Module({
  imports: [
    TerminusModule,
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
  controllers: [HealthController],
  providers: [
    RABBITMQ_HEALTH_PROVIDER,
    QueueHealthIndicator,
    WorkerHealthIndicator,
    {
      provide: 'PROM_METRIC_WORKER_HEALTH_CHECK_TOTAL',
      useValue: getOrCreateCounter({
        name: 'worker_health_check_total',
        help: 'Total number of health checks performed',
      }),
    },
    {
      provide: 'PROM_METRIC_WORKER_UPTIME_SECONDS',
      useValue: getOrCreateGauge({
        name: 'worker_uptime_seconds',
        help: 'Worker uptime in seconds',
      }),
    },
    {
      provide: 'PROMETHEUS_METRICS',
      useFactory: () => [
        {
          type: 'counter',
          name: 'worker_health_check_total',
          help: 'Total number of health checks performed',
        },
        {
          type: 'gauge',
          name: 'worker_uptime_seconds',
          help: 'Worker uptime in seconds',
        },
        {
          type: 'gauge',
          name: 'worker_queue_depth',
          help: 'Current depth of the execution queue',
        },
        {
          type: 'histogram',
          name: 'worker_job_processing_duration_seconds',
          help: 'Duration of job processing in seconds',
          labelNames: ['status'],
          buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300, 600],
        },
      ],
    },
  ],
  exports: [WorkerHealthIndicator],
})
export class HealthModule {}
