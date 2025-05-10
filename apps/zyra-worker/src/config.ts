import { RabbitMQModuleOptions } from '@argahvk/rabbitmq';
import { AssertQueue, Options } from 'amqplib';

interface ExtendedQueueOptions extends Options.AssertQueue {
  name: string;
  durable: boolean;
}

export const AMQP_CONNECTION = 'AMQP_CONNECTION';

// Queue names
export const EXECUTION_QUEUE = 'ZYRA.EXECUTION_QUEUE';
export const EXECUTION_DLQ = 'ZYRA.EXECUTION_QUEUE.DLQ'; // Dead Letter Queue
export const EXECUTION_RETRY_QUEUE = 'ZYRA.EXECUTION_QUEUE.RETRY'; // Retry Queue

// Circuit breaker settings
export const CIRCUIT_BREAKER = {
  failureThreshold: Number(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || 5),
  successThreshold: Number(process.env.CIRCUIT_BREAKER_SUCCESS_THRESHOLD || 2),
  resetTimeout: Number(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || 30000), // 30 seconds
};

// Queue configuration
export const queueOptions: (ExtendedQueueOptions & {
  options?: Options.AssertQueue;
})[] = [
  {
    name: EXECUTION_QUEUE,
    durable: true,
    options: {
      deadLetterExchange: '',
      deadLetterRoutingKey: EXECUTION_DLQ, // Use the predefined DLQ name
    },
  },
  { name: EXECUTION_RETRY_QUEUE, durable: true },
  { name: EXECUTION_DLQ, durable: true }, // No dead-letter options for DLQ
];

// Workflow execution settings
export const WORKFLOW_SETTINGS = {
  maxConcurrentNodes: Number(process.env.MAX_CONCURRENT_NODES || 5),
  nodeExecutionTimeout: Number(process.env.NODE_EXECUTION_TIMEOUT || 300000), // 5 minutes
  workflowExecutionTimeout: Number(
    process.env.WORKFLOW_EXECUTION_TIMEOUT || 3600000,
  ), // 1 hour
  maxRetries: Number(process.env.MAX_NODE_RETRIES || 3),
};
