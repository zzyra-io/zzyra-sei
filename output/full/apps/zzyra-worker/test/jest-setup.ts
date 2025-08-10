import { jest } from '@jest/globals';

// Set timeout for tests to 30 seconds
jest.setTimeout(30000);

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://test-supabase-url.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.MAX_RETRIES = '3';
process.env.RETRY_BACKOFF_MS = '100';
process.env.RETRY_JITTER_MS = '50';
process.env.NODE_EXECUTION_TIMEOUT = '10000';
process.env.ALLOW_TERMINAL_FINANCE_BLOCKS = 'true';
process.env.RABBITMQ_URL = 'amqp://localhost:5672';
process.env.EXECUTION_QUEUE = 'workflow_execution_queue';
process.env.EXECUTION_DLQ = 'workflow_execution_dlq';
