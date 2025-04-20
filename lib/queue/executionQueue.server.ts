import { config } from "@/lib/config";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
let channel: any;
const QUEUE_NAME = 'execution_queue';

export async function initExecutionQueue(): Promise<any> {
  if (channel) return channel;
  const amqp = await import('amqplib');
  const conn = await amqp.connect(RABBITMQ_URL);
  channel = await conn.createChannel();
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  channel.prefetch(config.concurrency.prefetch);
  return channel;
}

export async function addExecutionJob(executionId: string, workflowId: string): Promise<void> {
  const ch = await initExecutionQueue();
  ch.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify({ executionId, workflowId })), { persistent: true });
}
