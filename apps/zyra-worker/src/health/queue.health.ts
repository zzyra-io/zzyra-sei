import { Injectable, Inject } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { AmqpConnectionManager } from 'amqp-connection-manager';
import { RABBITMQ_HEALTH_PROVIDER } from './health.constants';

type RabbitMQHealthStatus = {
  connected: boolean;
  connectionDetails: {
    urls: string[];
    connectionAttempts: number;
  };
};

type ErrorWithMessage = Error & {
  message: string;
  stack?: string;
};

@Injectable()
export class QueueHealthIndicator extends HealthIndicator {
  constructor(
    @Inject(RABBITMQ_HEALTH_PROVIDER.provide) 
    private readonly connection: AmqpConnectionManager,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Check if the connection is established
      if (!this.connection.isConnected()) {
        return this.getStatus(key, false, { message: 'RabbitMQ connection is down' });
      }

      // Create a temporary channel to verify connection is working
      const channelWrapper = this.connection.createChannel({
        setup: async (channel) => channel
      });

      await channelWrapper.waitForConnect();
      
      // Get connection details with type-safe access
      const connectionDetails: RabbitMQHealthStatus = {
        connected: this.connection.isConnected(),
        connectionDetails: {
          urls: [(this.connection as any).connection.url],
          connectionAttempts: (this.connection as any).connection.connectionAttempts || 1
        }
      };

      return this.getStatus(key, true, connectionDetails);
    } catch (error) {
      const errorWithMessage = error as ErrorWithMessage;
      return this.getStatus(key, false, {
        message: `RabbitMQ health check failed: ${errorWithMessage.message}`,
        error: errorWithMessage.stack
      });
    }
  }
}
