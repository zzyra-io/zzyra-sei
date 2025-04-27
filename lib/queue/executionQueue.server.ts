import { config } from "@/lib/config";

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
      deadLetterRoutingKey: EXECUTION_DLQ, // Use the predefined DLQ name
    },
  },
  { name: EXECUTION_RETRY_QUEUE, durable: true },
  { name: EXECUTION_DLQ, durable: true }, // No dead-letter options for DLQ
];
export async function initExecutionQueue(): Promise<any> {
  if (channel) return channel;
  const amqp = await import("amqplib");
  const conn = await amqp.connect(RABBITMQ_URL);
  channel = await conn.createChannel();
  queueOptions.forEach((queue) => {
    channel.assertQueue(queue.name, queue.options);
  });
  channel.prefetch(config.concurrency.prefetch);
  return channel;
}

export async function addExecutionJob(
  executionId: string,
  workflowId: string,
  userId: string
): Promise<void> {
  const ch = await initExecutionQueue();
  const payload = { executionId, workflowId, userId };
  console.log("[Queue] Enqueue job:", payload);
  ch.sendToQueue(EXECUTION_QUEUE, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
  });
}
