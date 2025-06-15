import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";

const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
let channel: any;

// Queue names
export const EXECUTION_QUEUE = "ZYRA.EXECUTION_QUEUE";
export const EXECUTION_DLQ = "ZYRA.EXECUTION_QUEUE.DLQ"; // Dead Letter Queue
export const EXECUTION_RETRY_QUEUE = "ZYRA.EXECUTION_QUEUE.RETRY"; // Retry Queue

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
];

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private channel: any;
  private connection: any;

  async onModuleInit() {
    await this.initQueue();
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

  async getQueueStats(): Promise<{
    execution: number;
    retry: number;
    dlq: number;
  }> {
    try {
      const ch = await this.initQueue();

      const executionQueue = await ch.checkQueue(EXECUTION_QUEUE);
      const retryQueue = await ch.checkQueue(EXECUTION_RETRY_QUEUE);
      const dlqQueue = await ch.checkQueue(EXECUTION_DLQ);

      return {
        execution: executionQueue.messageCount,
        retry: retryQueue.messageCount,
        dlq: dlqQueue.messageCount,
      };
    } catch (error) {
      console.error("Failed to get queue stats:", error);
      return { execution: 0, retry: 0, dlq: 0 };
    }
  }
}
