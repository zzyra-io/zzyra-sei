import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import {
  AmqpConnectionManager,
  connect,
  ChannelWrapper,
} from 'amqp-connection-manager';
import {
  EXECUTION_QUEUE,
  EXECUTION_DLQ,
  EXECUTION_RETRY_QUEUE,
} from '../config';

export interface QueueMessage {
  executionId: string;
  workflowId: string;
  userId: string;
  payload?: any;
  retryCount?: number;
  timestamp?: string;
}

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * Wait for RabbitMQ connection and channel to be ready
   */
  private async waitForConnection(timeoutMs = 30000): Promise<void> {
    const startTime = Date.now();
    while (!this.channelWrapper && Date.now() - startTime < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (!this.channelWrapper) {
      throw new Error('RabbitMQ channel not ready after timeout');
    }

    // Wait for channel to be ready
    await this.channelWrapper.waitForConnect();
  }

  /**
   * Establish connection to RabbitMQ
   */
  private async connect(): Promise<void> {
    try {
      const rabbitmqUrl =
        this.configService.get<string>('RABBIT_MQ_URL') ||
        'amqp://guest:guest@localhost:5672';
      const urls = this.configService
        .get<string>('RABBIT_MQ_URLS')
        ?.split(',') || [rabbitmqUrl];

      this.logger.log(`Connecting to RabbitMQ: ${urls.join(', ')}`);

      // Create connection manager with retry logic
      this.connection = connect(urls, {
        // Remove invalid connection options - these are handled by amqplib internally
      });

      // Set up connection event handlers
      this.connection.on('connect', () => {
        this.logger.log('✅ RabbitMQ connection established');
        this.isConnected = true;
      });

      this.connection.on('disconnect', (err) => {
        this.logger.warn(
          '⚠️ RabbitMQ connection lost:',
          err?.err?.message || 'Unknown error',
        );
        this.isConnected = false;
      });

      this.connection.on('connectFailed', (err) => {
        this.logger.error(
          '❌ RabbitMQ connection failed:',
          err?.err?.message || 'Unknown error',
        );
        this.isConnected = false;
      });

      // Create channel wrapper with queue setup
      this.channelWrapper = this.connection.createChannel({
        json: true,
        setup: async (channel: amqp.Channel) => {
          await this.setupQueues(channel);
        },
      });

      // Channel event handlers
      this.channelWrapper.on('error', (err) => {
        this.logger.error('Channel error:', err);
      });

      this.channelWrapper.on('close', () => {
        this.logger.warn('Channel closed');
      });

      this.logger.log('🔄 RabbitMQ service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize RabbitMQ service:', error);
      throw error;
    }
  }

  /**
   * Setup queues with proper configuration
   */
  private async setupQueues(channel: amqp.Channel): Promise<void> {
    try {
      // Production-ready prefetch settings based on worker capacity
      const prefetchCount = parseInt(
        this.configService.get('RABBITMQ_PREFETCH') || '50', // Increased for higher throughput
      );
      await channel.prefetch(prefetchCount);

      // Check if queue exists first
      const queueCheck = await channel.checkQueue(EXECUTION_QUEUE);
      const queueExists = queueCheck.messageCount !== undefined;

      // Assert main execution queue with production settings
      await channel.assertQueue(EXECUTION_QUEUE, {
        durable: true,
        deadLetterExchange: '',
        deadLetterRoutingKey: EXECUTION_DLQ,
        // Only set TTL if queue doesn't exist
        ...(queueExists
          ? {}
          : {
              messageTtl: parseInt(
                this.configService.get('RABBITMQ_MESSAGE_TTL') || '3600000',
              ), // 1 hour default
            }),
        maxLength: parseInt(
          this.configService.get('RABBITMQ_MAX_QUEUE_LENGTH') || '100000', // Increased to 100K
        ),
        // Add priority queue support for high-volume scenarios
        arguments: {
          'x-max-priority': 10,
          'x-queue-mode': 'lazy', // Better for high volume with less memory usage
        },
      });

      // Check if retry queue exists
      const retryQueueCheck = await channel.checkQueue(EXECUTION_RETRY_QUEUE);
      const retryQueueExists = retryQueueCheck.messageCount !== undefined;

      // Assert retry queue with exponential backoff support
      await channel.assertQueue(EXECUTION_RETRY_QUEUE, {
        durable: true,
        deadLetterExchange: '',
        deadLetterRoutingKey: EXECUTION_QUEUE,
        // Only set TTL if queue doesn't exist
        ...(retryQueueExists
          ? {}
          : {
              messageTtl: parseInt(
                this.configService.get('RABBITMQ_RETRY_TTL') || '300000',
              ), // 5 minutes default
            }),
        arguments: {
          'x-queue-mode': 'lazy',
        },
      });

      // Check if DLQ exists
      const dlqCheck = await channel.checkQueue(EXECUTION_DLQ);
      const dlqExists = dlqCheck.messageCount !== undefined;

      // Assert dead letter queue
      await channel.assertQueue(EXECUTION_DLQ, {
        durable: true,
        arguments: {
          'x-queue-mode': 'lazy',
          // Only set TTL if queue doesn't exist
          ...(dlqExists
            ? {}
            : {
                'x-message-ttl': 604800000, // 7 days retention for failed messages
              }),
        },
      });

      this.logger.log(
        `✅ Production queues configured: ${EXECUTION_QUEUE}, ${EXECUTION_RETRY_QUEUE}, ${EXECUTION_DLQ}`,
      );
      this.logger.log(
        `📊 Prefetch count: ${prefetchCount}, Max queue length: ${parseInt(
          this.configService.get('RABBITMQ_MAX_QUEUE_LENGTH') || '100000',
        )}`,
      );
    } catch (error) {
      this.logger.error('Failed to setup queues:', error);
      throw error;
    }
  }

  /**
   * Publish message to execution queue
   */
  async publishExecution(message: QueueMessage): Promise<boolean> {
    try {
      if (!this.isConnected) {
        throw new Error('RabbitMQ not connected');
      }

      const messageWithTimestamp = {
        ...message,
        timestamp: new Date().toISOString(),
        retryCount: message.retryCount || 0,
      };

      await this.channelWrapper.sendToQueue(
        EXECUTION_QUEUE,
        messageWithTimestamp,
        {
          persistent: true,
          priority: this.calculatePriority(message),
          messageId: `exec-${message.executionId}-${Date.now()}`,
          timestamp: Date.now(),
        },
      );

      this.logger.log(`📤 Published execution message: ${message.executionId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to publish execution message: ${error}`);
      return false;
    }
  }

  /**
   * Publish message to retry queue
   */
  async publishRetry(message: QueueMessage, delayMs = 60000): Promise<boolean> {
    try {
      const retryMessage = {
        ...message,
        retryCount: (message.retryCount || 0) + 1,
        timestamp: new Date().toISOString(),
      };

      await this.channelWrapper.sendToQueue(
        EXECUTION_RETRY_QUEUE,
        retryMessage,
        {
          persistent: true,
          expiration: delayMs.toString(),
          messageId: `retry-${message.executionId}-${Date.now()}`,
        },
      );

      this.logger.log(
        `🔄 Published retry message: ${message.executionId} (attempt ${retryMessage.retryCount})`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to publish retry message: ${error}`);
      return false;
    }
  }

  /**
   * Setup consumer for execution queue
   */
  async consumeExecutions(
    handler: (
      message: QueueMessage,
      ack: () => void,
      nack: (requeue?: boolean) => void,
    ) => Promise<void>,
  ): Promise<void> {
    try {
      // Wait for connection to be ready
      await this.waitForConnection();

      await this.channelWrapper.consume(
        EXECUTION_QUEUE,
        async (msg) => {
          if (!msg) return;

          try {
            const message: QueueMessage = JSON.parse(msg.content.toString());

            await handler(
              message,
              () => this.channelWrapper.ack(msg),
              (requeue = false) =>
                this.channelWrapper.nack(msg, false, requeue),
            );
          } catch (error) {
            this.logger.error('Error processing message:', error);
            this.channelWrapper.nack(msg, false, false); // Send to DLQ
          }
        },
        {
          noAck: false,
          consumerTag: `worker-${process.pid}`,
        },
      );

      this.logger.log(`👂 Consumer setup for ${EXECUTION_QUEUE}`);
    } catch (error) {
      this.logger.error('Failed to setup consumer:', error);
      throw error;
    }
  }

  /**
   * Setup consumer for dead letter queue (for monitoring)
   */
  async consumeDLQ(handler: (message: any) => void): Promise<void> {
    try {
      // Wait for connection to be ready
      await this.waitForConnection();

      await this.channelWrapper.consume(
        EXECUTION_DLQ,
        async (msg) => {
          if (!msg) return;

          try {
            const message = JSON.parse(msg.content.toString());
            this.logger.error(`💀 Message in DLQ: ${JSON.stringify(message)}`);
            handler(message);
            this.channelWrapper.ack(msg);
          } catch (error) {
            this.logger.error('Error processing DLQ message:', error);
            this.channelWrapper.ack(msg); // Always ack DLQ messages
          }
        },
        { noAck: false },
      );

      this.logger.log(`👂 DLQ consumer setup for ${EXECUTION_DLQ}`);
    } catch (error) {
      this.logger.error('Failed to setup DLQ consumer:', error);
    }
  }

  /**
   * Calculate message priority
   */
  private calculatePriority(message: QueueMessage): number {
    // Higher priority for retries and specific user types
    if (message.payload?.priority) return message.payload.priority;
    if (message.retryCount && message.retryCount > 0) return 5;
    return 1; // Default priority
  }

  /**
   * Get connection status
   */
  isConnectionHealthy(): boolean {
    return this.isConnected && this.connection && this.connection.isConnected();
  }

  /**
   * Get comprehensive queue stats for production monitoring
   */
  async getQueueStats(): Promise<any> {
    try {
      if (!this.channelWrapper) return null;

      const [mainQueue, retryQueue, dlqQueue] = await Promise.all([
        this.channelWrapper.checkQueue(EXECUTION_QUEUE),
        this.channelWrapper.checkQueue(EXECUTION_RETRY_QUEUE),
        this.channelWrapper.checkQueue(EXECUTION_DLQ),
      ]);

      const stats = {
        [EXECUTION_QUEUE]: {
          messageCount: mainQueue.messageCount,
          consumerCount: mainQueue.consumerCount,
          status: mainQueue.messageCount > 50000 ? 'high_load' : 'normal',
        },
        [EXECUTION_RETRY_QUEUE]: {
          messageCount: retryQueue.messageCount,
          consumerCount: retryQueue.consumerCount,
          status: retryQueue.messageCount > 1000 ? 'high_retry_rate' : 'normal',
        },
        [EXECUTION_DLQ]: {
          messageCount: dlqQueue.messageCount,
          consumerCount: dlqQueue.consumerCount,
          status: dlqQueue.messageCount > 100 ? 'attention_needed' : 'normal',
        },
        connectionStatus: this.isConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        recommendations: this.getScalingRecommendations(
          mainQueue,
          retryQueue,
          dlqQueue,
        ),
      };

      return stats;
    } catch (error) {
      this.logger.error('Failed to get queue stats:', error);
      return {
        error: error instanceof Error ? error.message : String(error),
        connectionStatus: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Provide scaling recommendations based on queue metrics
   */
  private getScalingRecommendations(
    mainQueue: any,
    retryQueue: any,
    dlqQueue: any,
  ): string[] {
    const recommendations: string[] = [];

    // High message count recommendations
    if (mainQueue.messageCount > 50000) {
      recommendations.push(
        'Consider scaling up workers - high message backlog detected',
      );
    }
    if (mainQueue.messageCount > 100000) {
      recommendations.push(
        'URGENT: Message backlog critical - scale workers immediately',
      );
    }

    // Consumer recommendations
    if (mainQueue.messageCount > 1000 && mainQueue.consumerCount < 3) {
      recommendations.push('Consider adding more consumer workers');
    }

    // Retry rate recommendations
    if (retryQueue.messageCount > 1000) {
      recommendations.push('High retry rate detected - investigate root cause');
    }

    // DLQ recommendations
    if (dlqQueue.messageCount > 100) {
      recommendations.push(
        'Dead letter queue growing - manual intervention needed',
      );
    }
    if (dlqQueue.messageCount > 1000) {
      recommendations.push(
        'CRITICAL: Large number of failed messages - immediate attention required',
      );
    }

    // Performance recommendations
    if (mainQueue.messageCount > 10000) {
      recommendations.push(
        'Consider increasing RABBITMQ_PREFETCH for better throughput',
      );
    }

    return recommendations.length > 0
      ? recommendations
      : ['System operating normally'];
  }

  /**
   * Get performance metrics for monitoring
   */
  async getPerformanceMetrics(): Promise<any> {
    try {
      const queueStats = await this.getQueueStats();

      return {
        throughput: {
          estimated_messages_per_second: this.calculateThroughput(),
          prefetch_count: parseInt(
            this.configService.get('RABBITMQ_PREFETCH') || '50',
          ),
          batch_size: parseInt(
            this.configService.get('RABBITMQ_BATCH_SIZE') || '100',
          ),
        },
        capacity: {
          max_queue_length: parseInt(
            this.configService.get('RABBITMQ_MAX_QUEUE_LENGTH') || '100000',
          ),
          current_utilization: queueStats?.[EXECUTION_QUEUE]?.messageCount || 0,
          utilization_percentage:
            ((queueStats?.[EXECUTION_QUEUE]?.messageCount || 0) / 100000) * 100,
        },
        health: {
          connection_status: this.isConnectionHealthy()
            ? 'healthy'
            : 'unhealthy',
          last_check: new Date().toISOString(),
        },
        scaling: {
          recommended_workers: this.calculateRecommendedWorkers(queueStats),
          current_consumers: queueStats?.[EXECUTION_QUEUE]?.consumerCount || 0,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get performance metrics:', error);
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  private calculateThroughput(): number {
    // Estimate based on prefetch and typical processing time
    const prefetch = parseInt(
      this.configService.get('RABBITMQ_PREFETCH') || '50',
    );
    const avgProcessingTimeMs = 2000; // Assume 2 seconds per message
    return Math.round((prefetch * 1000) / avgProcessingTimeMs);
  }

  private calculateRecommendedWorkers(queueStats: any): number {
    const messageCount = queueStats?.[EXECUTION_QUEUE]?.messageCount || 0;
    const currentConsumers = queueStats?.[EXECUTION_QUEUE]?.consumerCount || 1;

    if (messageCount > 100000) return Math.max(currentConsumers * 3, 10);
    if (messageCount > 50000) return Math.max(currentConsumers * 2, 5);
    if (messageCount > 10000) return Math.max(currentConsumers + 2, 3);

    return Math.max(currentConsumers, 1);
  }

  /**
   * Graceful disconnect
   */
  private async disconnect(): Promise<void> {
    try {
      if (this.channelWrapper) {
        await this.channelWrapper.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.logger.log('🔌 RabbitMQ connection closed gracefully');
    } catch (error) {
      this.logger.error('Error closing RabbitMQ connection:', error);
    }
  }

  /**
   * Publish batch of messages for high-throughput scenarios
   */
  async publishBatch(
    messages: QueueMessage[],
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    try {
      if (!this.isConnected) {
        throw new Error('RabbitMQ not connected');
      }

      // Process in batches to avoid overwhelming the connection
      const batchSize = parseInt(
        this.configService.get('RABBITMQ_BATCH_SIZE') || '100',
      );

      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);

        const promises = batch.map(async (message) => {
          try {
            const messageWithTimestamp = {
              ...message,
              timestamp: new Date().toISOString(),
              retryCount: message.retryCount || 0,
            };

            await this.channelWrapper.sendToQueue(
              EXECUTION_QUEUE,
              messageWithTimestamp,
              {
                persistent: true,
                priority: this.calculatePriority(message),
                messageId: `exec-${message.executionId}-${Date.now()}`,
                timestamp: Date.now(),
              },
            );
            return true;
          } catch (error) {
            this.logger.error(
              `Failed to publish message ${message.executionId}: ${error}`,
            );
            return false;
          }
        });

        const results = await Promise.allSettled(promises);
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            success++;
          } else {
            failed++;
          }
        });

        // Add small delay between batches to prevent overwhelming
        if (i + batchSize < messages.length) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      this.logger.log(
        `📤 Batch published: ${success} success, ${failed} failed`,
      );
      return { success, failed };
    } catch (error) {
      this.logger.error(`Failed to publish batch: ${error}`);
      return { success, failed: messages.length - success };
    }
  }
}
