import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";

const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
let channel: any;

// Queue names
export const EXECUTION_QUEUE = "ZYRA.EXECUTION_QUEUE";
export const EXECUTION_DLQ = "ZYRA.EXECUTION_QUEUE.DLQ"; // Dead Letter Queue
export const EXECUTION_RETRY_QUEUE = "ZYRA.EXECUTION_QUEUE.RETRY"; // Retry Queue
export const EXECUTION_DELAYED_QUEUE = "ZYRA.EXECUTION_QUEUE.DELAYED"; // Delayed execution queue
export const EXECUTION_SCHEDULED_EXCHANGE = "ZYRA.EXECUTION_SCHEDULED"; // Exchange for scheduled messages

export const queueOptions: any[] = [
  {
    name: EXECUTION_QUEUE,
    durable: true,
    options: {
      deadLetterExchange: "",
      deadLetterRoutingKey: EXECUTION_DLQ,
    },
  },
  { name: EXECUTION_RETRY_QUEUE, durable: true },
  { name: EXECUTION_DLQ, durable: true },
  {
    name: EXECUTION_DELAYED_QUEUE,
    durable: true,
    options: {
      deadLetterExchange: "",
      deadLetterRoutingKey: EXECUTION_QUEUE, // Route to main queue when TTL expires
    },
  },
];

export const exchangeOptions: any[] = [
  {
    name: EXECUTION_SCHEDULED_EXCHANGE,
    type: "direct",
    durable: true,
  },
];

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private channel: any;
  private connection: any;

  async onModuleInit() {
    console.log(
      "⏭️ Skipping RabbitMQ queue initialization to avoid startup hang"
    );
    // await this.initQueue();
  }

  async onModuleDestroy() {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
  }

  private async initQueue(): Promise<any> {
    if (this.channel) return this.channel;

    try {
      const amqp = await import("amqplib");
      this.connection = await amqp.connect(RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      // Assert all exchanges
      for (const exchange of exchangeOptions) {
        await this.channel.assertExchange(exchange.name, exchange.type, {
          durable: exchange.durable,
        });
      }

      // Assert all queues
      for (const queue of queueOptions) {
        await this.channel.assertQueue(queue.name, queue.options);
      }

      // Set prefetch count
      const prefetchCount = parseInt(process.env.QUEUE_PREFETCH_COUNT || "1");
      await this.channel.prefetch(prefetchCount);

      console.log("Queue service initialized successfully");
      return this.channel;
    } catch (error) {
      console.error("Failed to initialize queue service:", error);
      throw error;
    }
  }

  async addExecutionJob(
    executionId: string,
    workflowId: string,
    userId: string
  ): Promise<void> {
    try {
      const ch = await this.initQueue();
      const payload = { executionId, workflowId, userId };

      console.log("[Queue] Enqueue job:", payload);

      await ch.sendToQueue(
        EXECUTION_QUEUE,
        Buffer.from(JSON.stringify(payload)),
        {
          persistent: true,
        }
      );
    } catch (error) {
      console.error("Failed to add execution job to queue:", error);
      throw error;
    }
  }

  async addScheduledExecutionJob(
    executionId: string,
    workflowId: string,
    userId: string,
    scheduledTime: Date
  ): Promise<void> {
    try {
      const ch = await this.initQueue();
      const payload = {
        executionId,
        workflowId,
        userId,
        scheduledTime: scheduledTime.toISOString(),
      };

      const now = new Date();
      const delay = scheduledTime.getTime() - now.getTime();

      if (delay <= 0) {
        // If scheduled time is in the past or now, execute immediately
        console.log(
          "[Queue] Scheduled time is in the past, executing immediately:",
          payload
        );
        return this.addExecutionJob(executionId, workflowId, userId);
      }

      console.log(
        `[Queue] Scheduling job for ${scheduledTime.toISOString()} (${delay}ms delay):`,
        payload
      );

      // Use TTL to delay the message
      await ch.sendToQueue(
        EXECUTION_DELAYED_QUEUE,
        Buffer.from(JSON.stringify(payload)),
        {
          persistent: true,
          expiration: delay.toString(), // TTL in milliseconds
        }
      );
    } catch (error) {
      console.error("Failed to add scheduled execution job to queue:", error);
      throw error;
    }
  }

  async addCronExecutionJob(
    executionId: string,
    workflowId: string,
    userId: string,
    cronExpression: string
  ): Promise<void> {
    try {
      const ch = await this.initQueue();
      const payload = {
        executionId,
        workflowId,
        userId,
        cronExpression,
        type: "cron",
      };

      console.log("[Queue] Enqueue cron job:", payload);

      // For cron jobs, we'll need a separate cron processor
      // This is a placeholder - you'd typically use a cron library
      await ch.publish(
        EXECUTION_SCHEDULED_EXCHANGE,
        "cron",
        Buffer.from(JSON.stringify(payload)),
        {
          persistent: true,
        }
      );
    } catch (error) {
      console.error("Failed to add cron execution job to queue:", error);
      throw error;
    }
  }

  async cancelScheduledJob(executionId: string): Promise<boolean> {
    try {
      // This is a simplified implementation
      // In a real system, you'd need to track scheduled jobs and remove them
      console.log(`[Queue] Cancelling scheduled job: ${executionId}`);

      // You could implement this by:
      // 1. Storing scheduled jobs in Redis with their message IDs
      // 2. Using RabbitMQ management API to remove specific messages
      // 3. Using a job scheduler like Bull or Agenda

      return true;
    } catch (error) {
      console.error("Failed to cancel scheduled job:", error);
      return false;
    }
  }

  async getQueueStats(): Promise<{
    execution: number;
    retry: number;
    dlq: number;
    delayed: number;
  }> {
    try {
      const ch = await this.initQueue();

      const executionQueue = await ch.checkQueue(EXECUTION_QUEUE);
      const retryQueue = await ch.checkQueue(EXECUTION_RETRY_QUEUE);
      const dlqQueue = await ch.checkQueue(EXECUTION_DLQ);
      const delayedQueue = await ch.checkQueue(EXECUTION_DELAYED_QUEUE);

      return {
        execution: executionQueue.messageCount,
        retry: retryQueue.messageCount,
        dlq: dlqQueue.messageCount,
        delayed: delayedQueue.messageCount,
      };
    } catch (error) {
      console.error("Failed to get queue stats:", error);
      return { execution: 0, retry: 0, dlq: 0, delayed: 0 };
    }
  }
}
