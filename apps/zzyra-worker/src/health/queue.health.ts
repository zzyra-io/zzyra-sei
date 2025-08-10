import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { RabbitMQService } from '../services/rabbitmq.service';

type RabbitMQHealthStatus = {
  connected: boolean;
  queueStats?: any;
  performance?: any;
};

type ErrorWithMessage = Error & {
  message: string;
  stack?: string;
};

@Injectable()
export class QueueHealthIndicator extends HealthIndicator {
  constructor(private readonly rabbitmqService: RabbitMQService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Check if the connection is established
      const isConnected = this.rabbitmqService.isConnectionHealthy();

      if (!isConnected) {
        return this.getStatus(key, false, {
          message: 'RabbitMQ connection is down',
        });
      }

      // Get queue stats and performance metrics
      const [queueStats, performanceMetrics] = await Promise.all([
        this.rabbitmqService.getQueueStats(),
        this.rabbitmqService.getPerformanceMetrics(),
      ]);

      const healthData: RabbitMQHealthStatus = {
        connected: isConnected,
        queueStats,
        performance: performanceMetrics,
      };

      return this.getStatus(key, true, healthData);
    } catch (error) {
      const errorWithMessage = error as ErrorWithMessage;
      return this.getStatus(key, false, {
        message: `RabbitMQ health check failed: ${errorWithMessage.message}`,
        error: errorWithMessage.stack,
      });
    }
  }
}
