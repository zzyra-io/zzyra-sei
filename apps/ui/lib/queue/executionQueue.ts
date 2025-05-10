import { config } from "@/lib/config";
// Use dynamic import of amqplib to avoid bundling Node-only modules in frontend
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

// Guard exports so client builds don't include amqplib/tls
let channel: any;
const QUEUE_NAME = 'execution_queue';

// Dynamic import to defer loading amqplib and avoid client bundling
// Client stub of queue—we import server fn in server contexts.
export async function initExecutionQueue(): Promise<any> {
  throw new Error('initExecutionQueue can only be used in server environments');
}

// Enqueue a workflow execution job
export async function addExecutionJob(executionId: string, workflowId: string): Promise<void> {
  throw new Error('addExecutionJob can only be used in server environments');
}
