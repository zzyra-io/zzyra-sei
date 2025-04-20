import amqp from "amqplib";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
const QUEUE_NAME = "execution_queue";
let channel: amqp.Channel;

// Initialize RabbitMQ channel
export async function initExecutionQueue(): Promise<amqp.Channel> {
  if (channel) return channel;
  const conn = await amqp.connect(RABBITMQ_URL);
  channel = await conn.createChannel();
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  channel.prefetch(1);
  return channel;
}

// Enqueue a workflow execution job
export async function addExecutionJob(executionId: string, workflowId: string): Promise<void> {
  const ch = await initExecutionQueue();
  const payload = JSON.stringify({ executionId, workflowId });
  ch.sendToQueue(QUEUE_NAME, Buffer.from(payload), { persistent: true });
}
