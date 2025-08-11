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

// Account Abstraction settings using Pimlico
export const AA_CONFIG = {
  // Pimlico API configuration for SEI testnet
  pimlicoApiKey: process.env.PIMLICO_API_KEY || 'pim_M6HVTohns99VGporUxitbs',
  bundlerUrl: (chainId: number = 1328) =>
    `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${process.env.PIMLICO_API_KEY || 'pim_M6HVTohns99VGporUxitbs'}`,

  // EntryPoint v0.6 for better compatibility
  entryPointAddress:
    process.env.AA_ENTRY_POINT || '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789', // EntryPoint v0.6

  enabled: process.env.ENABLE_AA !== 'false', // Default enabled

  // Simple Account Factory for Pimlico (standard address)
  simpleAccountFactory:
    process.env.SIMPLE_ACCOUNT_FACTORY ||
    '0x9406Cc6185a346906296840746125a0E44976454',

  // Chain configurations
  supportedChains: {
    seiTestnet: {
      id: 1328,
      name: 'SEI Testnet',
      rpcUrl: 'https://evm-rpc.sei-apis.com',
      explorerUrl: 'https://seitrace.com',
    },
    sepolia: {
      id: 11155111,
      name: 'Sepolia',
      rpcUrl: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY || ''}`,
      explorerUrl: 'https://sepolia.etherscan.io',
    },
  },

  // Gas sponsorship settings
  gasSponsorship: {
    enabled: process.env.PIMLICO_GAS_SPONSORSHIP !== 'false',
    fallbackToUserPaid: process.env.PIMLICO_FALLBACK_USER_PAID === 'true',
  },

  // Development settings
  simulationMode: process.env.AA_SIMULATION_MODE === 'true', // Default to real execution
};
