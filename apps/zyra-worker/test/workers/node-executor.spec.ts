import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { NodeExecutor } from '../../src/workers/node-executor';
import { ExecutionLogger } from '../../src/workers/execution-logger';

import {
  createMockSupabaseClient,
  createMockNodeExecution,
} from '../utils/mocks';
import * as serviceClient from '../../src/lib/supabase/serviceClient';
import { BlockType, BlockHandler } from '@zyra/types';

// Mock the createServiceClient function
jest.mock('../../src/lib/supabase/serviceClient', () => ({
  createServiceClient: jest.fn(),
}));

// Mock the trace module
jest.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: jest.fn().mockReturnValue({
      startSpan: jest.fn().mockReturnValue({
        end: jest.fn(),
        setStatus: jest.fn(),
        recordException: jest.fn(),
      }),
    }),
  },
}));

// Mock the BlockHandlerRegistry
jest.mock('../../src/workers/handlers/BlockHandlerRegistry', () => {
  const mockEmailHandler = {
    execute: jest.fn(),
    validate: jest.fn(),
  };

  const mockAIBlockchainHandler = {
    execute: jest.fn(),
    validate: jest.fn(),
  };

  const mockDatabaseHandler = {
    execute: jest.fn(),
    validate: jest.fn(),
  };

  const mockCustomBlockHandler = {
    execute: jest.fn(),
    validate: jest.fn(),
  };

  const mockInputHandler = {
    execute: jest.fn(),
    validate: jest.fn(),
  };

  return {
    BlockHandlerRegistry: jest.fn().mockImplementation(() => ({
      getAllHandlers: jest.fn().mockReturnValue({
        [BlockType.EMAIL]: mockEmailHandler,
        [BlockType.AI_BLOCKCHAIN]: mockAIBlockchainHandler,
        [BlockType.DATABASE]: mockDatabaseHandler,
        [BlockType.CUSTOM]: mockCustomBlockHandler,
      }),
    })),
  };
});

describe('NodeExecutor', () => {
  let nodeExecutor: NodeExecutor;
  let executionLogger: jest.Mocked<ExecutionLogger>;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(async () => {
    // Create mocks
    mockSupabase = createMockSupabaseClient();

    // Mock the createServiceClient function to return our mock Supabase client
    (serviceClient.createServiceClient as jest.Mock).mockReturnValue(
      mockSupabase.client,
    );

    // Create mock services
    const mockExecutionLogger = {
      logExecutionEvent: jest.fn(),
      logNodeEvent: jest.fn(),
    };

    // Create the testing module
    const moduleRef = await Test.createTestingModule({
      providers: [
        NodeExecutor,
        {
          provide: ExecutionLogger,
          useValue: mockExecutionLogger,
        },
      ],
    }).compile();

    // Get the service instance
    nodeExecutor = moduleRef.get<NodeExecutor>(NodeExecutor);
    executionLogger = moduleRef.get(
      ExecutionLogger,
    ) as jest.Mocked<ExecutionLogger>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeNode', () => {
    it('should execute a node successfully', async () => {
      // Create a sample node
      const node = {
        id: 'node1',
        type: 'default',
        data: {
          type: BlockType.EMAIL,
          label: 'Send Email',
          to: 'test@example.com',
          subject: 'Test',
          body: 'Test body',
        },
        position: { x: 200, y: 0 },
      };

      // Mock Supabase responses
      // For node execution status
      mockSupabase.setResponse({ data: null, error: null });
      // For node execution record
      mockSupabase.setResponse({
        data: createMockNodeExecution({ node_id: 'node1' }),
        error: null,
      });
      // For workflow pause check
      mockSupabase.setResponse({ data: null, error: null });

      // Mock the handler execute method
      const mockHandler =
        require('../../src/workers/handlers/BlockHandlerRegistry')
          .BlockHandlerRegistry()
          .getAllHandlers()[BlockType.EMAIL];
      mockHandler.execute.mockResolvedValue({
        success: true,
        data: { result: 'email-sent' },
      });

      // Call executeNode
      const result = await nodeExecutor.executeNode(
        node,
        'test-execution-id',
        'test-user-id',
        {},
      );

      // Verify that the node was executed successfully
      expect(result).toEqual({ success: true, data: { result: 'email-sent' } });

      // Verify that Supabase was called to update node execution status
      expect(mockSupabase.client.from).toHaveBeenCalledWith(
        'execution_node_status',
      );
      expect(mockSupabase.mocks.insert).toHaveBeenCalled();

      // Verify that the handler was called with the correct parameters
      expect(mockHandler.execute).toHaveBeenCalled();
    });

    it('should handle node execution failures', async () => {
      // Create a sample node
      const node = {
        id: 'node1',
        type: 'default',
        data: {
          type: BlockType.EMAIL,
          label: 'Send Email',
          to: 'test@example.com',
          subject: 'Test',
          body: 'Test body',
        },
        position: { x: 200, y: 0 },
      };

      // Mock Supabase responses
      // For node execution status
      mockSupabase.setResponse({ data: null, error: null });
      // For node execution record
      mockSupabase.setResponse({
        data: createMockNodeExecution({ node_id: 'node1' }),
        error: null,
      });
      // For workflow pause check
      mockSupabase.setResponse({ data: null, error: null });

      // Mock the handler execute method to throw an error
      const mockHandler =
        require('../../src/workers/handlers/BlockHandlerRegistry')
          .BlockHandlerRegistry()
          .getAllHandlers()[BlockType.EMAIL];
      mockHandler.execute.mockRejectedValue(new Error('Email sending failed'));

      // Call executeNode and expect it to throw
      await expect(
        nodeExecutor.executeNode(node, 'test-execution-id', 'test-user-id', {}),
      ).rejects.toThrow('Email sending failed');

      // Verify that Supabase was called to update node execution status
      expect(mockSupabase.client.from).toHaveBeenCalledWith(
        'execution_node_status',
      );
      expect(mockSupabase.mocks.insert).toHaveBeenCalled();

      // Verify that the handler was called
      expect(mockHandler.execute).toHaveBeenCalled();
    });

    it('should retry failed node executions', async () => {
      // Create a sample node
      const node = {
        id: 'node1',
        type: 'default',
        data: {
          type: BlockType.EMAIL,
          label: 'Send Email',
          to: 'test@example.com',
          subject: 'Test',
          body: 'Test body',
        },
        position: { x: 200, y: 0 },
      };

      // Mock Supabase responses
      // For node execution status
      mockSupabase.setResponse({ data: null, error: null });
      // For node execution record
      mockSupabase.setResponse({
        data: createMockNodeExecution({ node_id: 'node1' }),
        error: null,
      });
      // For workflow pause check
      mockSupabase.setResponse({ data: null, error: null });

      // Mock the handler execute method to fail twice and then succeed
      const mockHandler =
        require('../../src/workers/handlers/BlockHandlerRegistry')
          .BlockHandlerRegistry()
          .getAllHandlers()[BlockType.EMAIL];
      mockHandler.execute
        .mockRejectedValueOnce(new Error('Email sending failed - attempt 1'))
        .mockRejectedValueOnce(new Error('Email sending failed - attempt 2'))
        .mockResolvedValueOnce({
          success: true,
          data: { result: 'email-sent' },
        });

      // Override MAX_RETRIES for testing
      const originalMaxRetries = process.env.MAX_RETRIES;
      process.env.MAX_RETRIES = '3';

      // Call executeNode
      const result = await nodeExecutor.executeNode(
        node,
        'test-execution-id',
        'test-user-id',
        {},
      );

      // Restore MAX_RETRIES
      process.env.MAX_RETRIES = originalMaxRetries;

      // Verify that the node was executed successfully after retries
      expect(result).toEqual({ success: true, data: { result: 'email-sent' } });

      // Verify that the handler was called multiple times
      expect(mockHandler.execute).toHaveBeenCalledTimes(3);

      // Verify that execution events were logged
      expect(executionLogger.logNodeEvent).toHaveBeenCalled();
    });

    it('should fail after maximum retries', async () => {
      // Create a sample node
      const node = {
        id: 'node1',
        type: 'default',
        data: {
          type: BlockType.EMAIL,
          label: 'Send Email',
          to: 'test@example.com',
          subject: 'Test',
          body: 'Test body',
        },
        position: { x: 200, y: 0 },
      };

      // Mock Supabase responses
      // For node execution status
      mockSupabase.setResponse({ data: null, error: null });
      // For node execution record
      mockSupabase.setResponse({
        data: createMockNodeExecution({ node_id: 'node1' }),
        error: null,
      });
      // For workflow pause check
      mockSupabase.setResponse({ data: null, error: null });

      // Mock the handler execute method to always fail
      const mockHandler =
        require('../../src/workers/handlers/BlockHandlerRegistry')
          .BlockHandlerRegistry()
          .getAllHandlers()[BlockType.EMAIL];
      mockHandler.execute.mockRejectedValue(new Error('Email sending failed'));

      // Override MAX_RETRIES for testing
      const originalMaxRetries = process.env.MAX_RETRIES;
      process.env.MAX_RETRIES = '2';

      // Call executeNode and expect it to throw
      await expect(
        nodeExecutor.executeNode(node, 'test-execution-id', 'test-user-id', {}),
      ).rejects.toThrow('Email sending failed');

      // Restore MAX_RETRIES
      process.env.MAX_RETRIES = originalMaxRetries;

      // Verify that the handler was called multiple times
      expect(mockHandler.execute).toHaveBeenCalledTimes(3); // Initial attempt + 2 retries

      // Verify that execution events were logged
      expect(executionLogger.logNodeEvent).toHaveBeenCalled();
    });

    it('should handle paused workflows', async () => {
      // Create a sample node
      const node = {
        id: 'node1',
        type: 'default',
        data: {
          type: BlockType.EMAIL,
          label: 'Send Email',
          to: 'test@example.com',
          subject: 'Test',
          body: 'Test body',
        },
        position: { x: 200, y: 0 },
      };

      // Mock Supabase responses
      // For node execution status
      mockSupabase.setResponse({ data: null, error: null });
      // For node execution record
      mockSupabase.setResponse({
        data: createMockNodeExecution({ node_id: 'node1' }),
        error: null,
      });
      // For workflow pause check - return a pause record
      mockSupabase.setResponse({
        data: {
          id: 'pause1',
          execution_id: 'test-execution-id',
          node_id: 'node1',
          resumed_at: null,
        },
        error: null,
      });

      // Call executeNode and expect it to throw a pause error
      await expect(
        nodeExecutor.executeNode(node, 'test-execution-id', 'test-user-id', {}),
      ).rejects.toThrow('Node node1 is paused');

      // Verify that the handler was not called
      const mockHandler =
        require('../../src/workers/handlers/BlockHandlerRegistry')
          .BlockHandlerRegistry()
          .getAllHandlers()[BlockType.EMAIL];
      expect(mockHandler.execute).not.toHaveBeenCalled();
    });

    it('should handle node execution timeout', async () => {
      // Create a sample node
      const node = {
        id: 'node1',
        type: 'default',
        data: {
          type: BlockType.EMAIL,
          label: 'Send Email',
          to: 'test@example.com',
          subject: 'Test',
          body: 'Test body',
        },
        position: { x: 200, y: 0 },
      };

      // Mock Supabase responses
      // For node execution status
      mockSupabase.setResponse({ data: null, error: null });
      // For node execution record
      mockSupabase.setResponse({
        data: createMockNodeExecution({ node_id: 'node1' }),
        error: null,
      });
      // For workflow pause check
      mockSupabase.setResponse({ data: null, error: null });

      // Mock the handler execute method to never resolve
      const mockHandler =
        require('../../src/workers/handlers/BlockHandlerRegistry')
          .BlockHandlerRegistry()
          .getAllHandlers()[BlockType.EMAIL];
      mockHandler.execute.mockImplementation(
        () =>
          new Promise((resolve) => {
            // This promise will never resolve
          }),
      );

      // Override NODE_EXECUTION_TIMEOUT for testing
      const originalTimeout = process.env.NODE_EXECUTION_TIMEOUT;
      process.env.NODE_EXECUTION_TIMEOUT = '100'; // 100ms timeout

      // Call executeNode and expect it to throw a timeout error
      await expect(
        nodeExecutor.executeNode(node, 'test-execution-id', 'test-user-id', {}),
      ).rejects.toThrow('Node execution timed out');

      // Restore NODE_EXECUTION_TIMEOUT
      process.env.NODE_EXECUTION_TIMEOUT = originalTimeout;
    });
  });

  describe('prepareBlockData', () => {
    it('should prepare data for AI_BLOCKCHAIN blocks', () => {
      // Create a sample node
      const node = {
        id: 'node1',
        type: 'default',
        data: {
          type: BlockType.AI_BLOCKCHAIN,
          label: 'AI Blockchain',
          operation: 'query',
          parameters: { prompt: 'test prompt' },
        },
        position: { x: 200, y: 0 },
      };

      // Call prepareBlockData
      const result = (nodeExecutor as any).prepareBlockData(
        node,
        BlockType.AI_BLOCKCHAIN,
      );

      // Verify that the data was prepared correctly
      expect(result).toEqual({
        type: BlockType.AI_BLOCKCHAIN,
        label: 'AI Blockchain',
        operation: 'query',
        parameters: { prompt: 'test prompt' },
        config: {
          timeout: 30000,
          retries: 3,
        },
      });
    });

    it('should prepare data for EMAIL blocks', () => {
      // Create a sample node
      const node = {
        id: 'node1',
        type: 'default',
        data: {
          type: BlockType.EMAIL,
          label: 'Send Email',
          to: 'test@example.com',
          subject: 'Test',
          body: 'Test body',
        },
        position: { x: 200, y: 0 },
      };

      // Call prepareBlockData
      const result = (nodeExecutor as any).prepareBlockData(
        node,
        BlockType.EMAIL,
      );

      // Verify that the data was prepared correctly
      expect(result).toEqual({
        type: BlockType.EMAIL,
        label: 'Send Email',
        to: 'test@example.com',
        subject: 'Test',
        body: 'Test body',
        config: {
          template: null,
          attachments: [],
        },
      });
    });

    it('should prepare data for CUSTOM blocks', () => {
      // Create a sample node
      const node = {
        id: 'node1',
        type: 'default',
        data: {
          type: BlockType.CUSTOM,
          label: 'Custom Block',
          customBlockId: 'custom1',
          inputs: { param1: 'value1' },
        },
        position: { x: 200, y: 0 },
      };

      // Call prepareBlockData
      const result = (nodeExecutor as any).prepareBlockData(
        node,
        BlockType.CUSTOM,
      );

      // Verify that the data was prepared correctly
      expect(result).toEqual({
        type: BlockType.CUSTOM,
        label: 'Custom Block',
        customBlockId: 'custom1',
        inputs: { param1: 'value1' },
      });
    });

    it('should handle missing data fields', () => {
      // Create a sample node with minimal data
      const node = {
        id: 'node1',
        type: 'default',
        data: {
          type: BlockType.EMAIL,
          label: 'Send Email',
        },
        position: { x: 200, y: 0 },
      };

      // Call prepareBlockData
      const result = (nodeExecutor as any).prepareBlockData(
        node,
        BlockType.EMAIL,
      );

      // Verify that default values were used for missing fields
      expect(result).toEqual({
        type: BlockType.EMAIL,
        label: 'Send Email',
        to: '',
        subject: '',
        body: '',
        config: {
          template: null,
          attachments: [],
        },
      });
    });
  });

  describe('getOrCreateNodeExecution', () => {
    it('should get an existing node execution', async () => {
      // Mock Supabase to return an existing node execution
      const mockNodeExecution = createMockNodeExecution({ node_id: 'node1' });
      mockSupabase.setResponse({ data: mockNodeExecution, error: null });

      // Call getOrCreateNodeExecution using a workaround for private method
      const result = await (nodeExecutor as any).getOrCreateNodeExecution(
        mockSupabase.client,
        'test-execution-id',
        'node1',
      );

      // Verify that Supabase was queried for the node execution
      expect(mockSupabase.client.from).toHaveBeenCalledWith('node_executions');
      expect(mockSupabase.mocks.select).toHaveBeenCalled();
      expect(mockSupabase.mocks.match).toHaveBeenCalledWith({
        execution_id: 'test-execution-id',
        node_id: 'node1',
      });

      // Verify that the correct node execution was returned
      expect(result).toEqual(mockNodeExecution);
    });

    it('should create a new node execution if one does not exist', async () => {
      // Mock Supabase to return no existing node execution
      mockSupabase.setResponse({ data: null, error: null });

      // Mock Supabase to return a newly created node execution
      const mockNewNodeExecution = createMockNodeExecution({
        node_id: 'node1',
      });
      mockSupabase.setResponse({ data: mockNewNodeExecution, error: null });

      // Call getOrCreateNodeExecution
      const result = await (nodeExecutor as any).getOrCreateNodeExecution(
        mockSupabase.client,
        'test-execution-id',
        'node1',
      );

      // Verify that Supabase was queried for the node execution
      expect(mockSupabase.client.from).toHaveBeenCalledWith('node_executions');
      expect(mockSupabase.mocks.select).toHaveBeenCalled();
      expect(mockSupabase.mocks.match).toHaveBeenCalled();

      // Verify that a new node execution was created
      expect(mockSupabase.mocks.insert).toHaveBeenCalled();

      // Verify that the correct node execution was returned
      expect(result).toEqual(mockNewNodeExecution);
    });

    it('should handle errors when creating a node execution', async () => {
      // Mock Supabase to return no existing node execution
      mockSupabase.setResponse({ data: null, error: null });

      // Mock Supabase to return an error when creating a node execution
      mockSupabase.setResponse({
        data: null,
        error: { message: 'Failed to create node execution' },
      });

      // Call getOrCreateNodeExecution and expect it to throw
      await expect(
        (nodeExecutor as any).getOrCreateNodeExecution(
          mockSupabase.client,
          'test-execution-id',
          'node1',
        ),
      ).rejects.toThrow('Failed to create node execution record');
    });
  });
});
