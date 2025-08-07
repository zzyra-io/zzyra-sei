import { Options } from 'amqplib';

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
  enabled: process.env.CIRCUIT_BREAKER_ENABLED !== 'false', // Default to true, can be disabled with CIRCUIT_BREAKER_ENABLED=false
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

// Account Abstraction settings
export const AA_CONFIG = {
  // ZeroDev bundler and paymaster URLs for production AA (v3 API for SEI)
  bundlerUrl:
    process.env.AA_BUNDLER_URL ||
    'https://rpc.zerodev.app/api/v3/8e6f4057-e935-485f-9b6d-f14696e92654/chain/1328',
  paymasterUrl:
    process.env.AA_PAYMASTER_URL ||
    'https://rpc.zerodev.app/api/v3/8e6f4057-e935-485f-9b6d-f14696e92654/chain/1328',
  entryPointAddress:
    process.env.AA_ENTRY_POINT || '0x0000000071727De22E5E9d8BAf0edAc6f37da032', // EntryPoint v0.7
  enabled: process.env.ENABLE_AA !== 'false', // Default enabled

  // ZeroDev project configuration
  projectId:
    process.env.ZERODEV_PROJECT_ID || '8e6f4057-e935-485f-9b6d-f14696e92654',

  // ZeroDev paymaster addresses for SEI network
  verifyingPaymaster:
    process.env.ZERODEV_VERIFYING_PAYMASTER ||
    '0x6dcaa49D90033806799eDC614e61A9DFF4b39182',
  erc20Paymaster:
    process.env.ZERODEV_ERC20_PAYMASTER ||
    '0x413eA2Bc98f3eff71091120e9386ed88D31F950A',

  // Disable simulation mode for production with real ZeroDev
  simulationMode: process.env.AA_SIMULATION_MODE === 'true', // Default to real execution
};
