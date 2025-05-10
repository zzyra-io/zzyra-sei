import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { ExecutionWorker } from '../../src/workers/execution-worker';
import { WorkflowService } from '../../src/lib/services/workflow-service';
import { WorkflowExecutor } from '../../src/workers/workflow-executor';
import { ExecutionLogger } from '../../src/workers/execution-logger';
import { ErrorHandler } from '../../src/workers/error-handler';
import { AMQP_CONNECTION, EXECUTION_DLQ, EXECUTION_QUEUE } from '../../src/config';
import { 
  createMockAmqpConnection, 
  createMockSupabaseClient, 
  createMockWorkflow, 
  createMockExecution,
  createMockProfile,
  createMockExecutionJob
} from '../utils/mocks';
import * as serviceClient from '../../src/lib/supabase/serviceClient';

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

describe('ExecutionWorker', () => {
  let executionWorker: ExecutionWorker;
  let workflowService: jest.Mocked<WorkflowService>;
  let workflowExecutor: jest.Mocked<WorkflowExecutor>;
  let executionLogger: jest.Mocked<ExecutionLogger>;
  let errorHandler: jest.Mocked<ErrorHandler>;
  let mockAmqp: ReturnType<typeof createMockAmqpConnection>;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(async () => {
    // Create mocks
    mockAmqp = createMockAmqpConnection();
    mockSupabase = createMockSupabaseClient();
    
    // Mock the createServiceClient function to return our mock Supabase client
    (serviceClient.createServiceClient as jest.Mock).mockReturnValue(mockSupabase.client);
    
    // Create mock services
    const mockWorkflowService = {
      getWorkflow: jest.fn(),
    };
    
    const mockWorkflowExecutor = {
      executeWorkflow: jest.fn(),
    };
    
    const mockExecutionLogger = {
      logExecutionEvent: jest.fn(),
      logNodeEvent: jest.fn(),
    };
    
    const mockErrorHandler = {
      handleJobFailure: jest.fn(),
    };
    
    // Create the testing module
    const moduleRef = await Test.createTestingModule({
      providers: [
        ExecutionWorker,
        {
          provide: WorkflowService,
          useValue: mockWorkflowService,
        },
        {
          provide: WorkflowExecutor,
          useValue: mockWorkflowExecutor,
        },
        {
          provide: ExecutionLogger,
          useValue: mockExecutionLogger,
        },
        {
          provide: ErrorHandler,
          useValue: mockErrorHandler,
        },
        {
          provide: AMQP_CONNECTION,
          useValue: mockAmqp.connection,
        },
        {
          provide: 'QUEUE_NAMES',
          useValue: [
            { name: EXECUTION_QUEUE, durable: true, options: {} },
            { name: EXECUTION_DLQ, durable: true, options: {} },
          ],
        },
      ],
    }).compile();
    
    // Get the service instance
    executionWorker = moduleRef.get<ExecutionWorker>(ExecutionWorker);
    workflowService = moduleRef.get(WorkflowService) as jest.Mocked<WorkflowService>;
    workflowExecutor = moduleRef.get(WorkflowExecutor) as jest.Mocked<WorkflowExecutor>;
    executionLogger = moduleRef.get(ExecutionLogger) as jest.Mocked<ExecutionLogger>;
    errorHandler = moduleRef.get(ErrorHandler) as jest.Mocked<ErrorHandler>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should create a channel and set up queue consumers', async () => {
      // Call onModuleInit
      await executionWorker.onModuleInit();
      
      // Verify that the channel was created
      expect(mockAmqp.connection.createChannel).toHaveBeenCalled();
      
      // Verify that event listeners were set up
      expect(mockAmqp.channelWrapper.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockAmqp.connection.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('processItem', () => {
    it('should process pending executions', async () => {
      // Mock the Supabase response for pending executions
      const mockPendingExecutions = [
        createMockExecution({ id: 'exec1', status: 'pending' }),
        createMockExecution({ id: 'exec2', status: 'pending' }),
      ];
      
      mockSupabase.setResponse({ data: mockPendingExecutions, error: null });
      
      // Call processItem
      // @ts-ignore - private method
      await executionWorker.processItem([]);
      
      // Verify that Supabase was queried for pending executions
      expect(mockSupabase.client.from).toHaveBeenCalledWith('workflow_executions');
      expect(mockSupabase.mocks.select).toHaveBeenCalled();
      expect(mockSupabase.mocks.eq).toHaveBeenCalledWith('status', 'pending');
    });
    
    it('should handle errors when fetching pending executions', async () => {
      // Mock an error response from Supabase
      mockSupabase.setResponse({ data: null, error: { message: 'Database error' } });
      
      // Call processItem and expect it to throw
      await expect(
        // @ts-ignore - private method
        executionWorker.processItem([])
      ).rejects.toThrow('Failed to fetch pending executions: Database error');
    });
    
    it('should do nothing if no pending executions are found', async () => {
      // Mock an empty response from Supabase
      mockSupabase.setResponse({ data: [], error: null });
      
      // Call processItem
      // @ts-ignore - private method
      await executionWorker.processItem([]);
      
      // Verify that no further processing was done
      expect(workflowExecutor.executeWorkflow).not.toHaveBeenCalled();
    });
  });

  describe('processJob', () => {
    it('should process a job and execute the workflow', async () => {
      // Create mock data
      const mockJob = createMockExecutionJob();
      const mockWorkflow = createMockWorkflow();
      const mockProfile = createMockProfile();
      
      // Mock the workflow service response
      workflowService.getWorkflow.mockResolvedValue({ data: mockWorkflow, error: null });
      
      // Mock Supabase responses
      // For workflow execution
      mockSupabase.setResponse({ data: createMockExecution(), error: null });
      // For profile
      mockSupabase.setResponse({ data: [mockProfile], error: null });
      
      // Mock the workflow executor response
      workflowExecutor.executeWorkflow.mockResolvedValue({
        status: 'completed',
        outputs: { result: 'success' },
        error: null,
      });
      
      // Call processJob
      // @ts-ignore - private method
      await executionWorker.processJob(mockJob, mockSupabase.client);
      
      // Verify that the workflow was executed
      expect(workflowExecutor.executeWorkflow).toHaveBeenCalled();
      
      // Verify that the execution status was updated
      expect(mockSupabase.client.from).toHaveBeenCalledWith('workflow_executions');
      expect(mockSupabase.mocks.update).toHaveBeenCalled();
      
      // Verify that execution events were logged
      expect(executionLogger.logExecutionEvent).toHaveBeenCalled();
    });
    
    it('should handle workflow execution failures', async () => {
      // Create mock data
      const mockJob = createMockExecutionJob();
      const mockWorkflow = createMockWorkflow();
      const mockProfile = createMockProfile();
      
      // Mock the workflow service response
      workflowService.getWorkflow.mockResolvedValue({ data: mockWorkflow, error: null });
      
      // Mock Supabase responses
      // For workflow execution
      mockSupabase.setResponse({ data: createMockExecution(), error: null });
      // For profile
      mockSupabase.setResponse({ data: [mockProfile], error: null });
      
      // Mock the workflow executor to throw an error
      workflowExecutor.executeWorkflow.mockRejectedValue(new Error('Workflow execution failed'));
      
      // Call processJob
      // @ts-ignore - private method
      await executionWorker.processJob(mockJob, mockSupabase.client);
      
      // Verify that the error handler was called
      expect(errorHandler.handleJobFailure).toHaveBeenCalledWith(
        expect.any(Error),
        mockJob.execution_id,
        mockJob.user_id
      );
    });
    
    it('should handle paused workflows', async () => {
      // Create mock data
      const mockJob = createMockExecutionJob();
      const mockWorkflow = createMockWorkflow();
      const mockProfile = createMockProfile();
      
      // Mock the workflow service response
      workflowService.getWorkflow.mockResolvedValue({ data: mockWorkflow, error: null });
      
      // Mock Supabase responses
      // For workflow execution - set status to paused
      mockSupabase.setResponse({ 
        data: createMockExecution({ status: 'paused' }), 
        error: null 
      });
      // For profile
      mockSupabase.setResponse({ data: [mockProfile], error: null });
      
      // Call processJob
      // @ts-ignore - private method
      await executionWorker.processJob(mockJob, mockSupabase.client);
      
      // Verify that the workflow was not executed
      expect(workflowExecutor.executeWorkflow).not.toHaveBeenCalled();
    });
    
    it('should handle workflow not found', async () => {
      // Create mock data
      const mockJob = createMockExecutionJob();
      
      // Mock the workflow service to return an error
      workflowService.getWorkflow.mockResolvedValue({ data: null, error: 'Workflow not found' });
      
      // Call processJob
      // @ts-ignore - private method
      await expect(executionWorker.processJob(mockJob, mockSupabase.client)).rejects.toThrow();
      
      // Verify that the error handler was called
      expect(errorHandler.handleJobFailure).toHaveBeenCalled();
    });
    
    it('should create a profile if one does not exist', async () => {
      // Create mock data
      const mockJob = createMockExecutionJob();
      const mockWorkflow = createMockWorkflow();
      
      // Mock the workflow service response
      workflowService.getWorkflow.mockResolvedValue({ data: mockWorkflow, error: null });
      
      // Mock Supabase responses
      // For workflow execution
      mockSupabase.setResponse({ data: createMockExecution(), error: null });
      // For profile - return empty to trigger creation
      mockSupabase.setResponse({ data: [], error: null });
      // For profile creation
      mockSupabase.setResponse({ data: null, error: null });
      
      // Mock the workflow executor response
      workflowExecutor.executeWorkflow.mockResolvedValue({
        status: 'completed',
        outputs: { result: 'success' },
        error: null,
      });
      
      // Call processJob
      // @ts-ignore - private method
      await executionWorker.processJob(mockJob, mockSupabase.client);
      
      // Verify that a profile was created
      expect(mockSupabase.client.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.mocks.insert).toHaveBeenCalled();
    });
    
    it('should handle profile creation errors', async () => {
      // Create mock data
      const mockJob = createMockExecutionJob();
      const mockWorkflow = createMockWorkflow();
      
      // Mock the workflow service response
      workflowService.getWorkflow.mockResolvedValue({ data: mockWorkflow, error: null });
      
      // Mock Supabase responses
      // For workflow execution
      mockSupabase.setResponse({ data: createMockExecution(), error: null });
      // For profile - return empty to trigger creation
      mockSupabase.setResponse({ data: [], error: null });
      // For profile creation - return an error
      mockSupabase.setResponse({ data: null, error: { message: 'Failed to create profile' } });
      
      // Call processJob and expect it to throw
      // @ts-ignore - private method
      await expect(executionWorker.processJob(mockJob, mockSupabase.client)).rejects.toThrow();
      
      // Verify that the error handler was called
      expect(errorHandler.handleJobFailure).toHaveBeenCalled();
    });
  });

  describe('fetchWorkflow', () => {
    it('should fetch a workflow and cache it', async () => {
      // Mock the workflow service response
      const mockWorkflow = createMockWorkflow();
      workflowService.getWorkflow.mockResolvedValue({ data: mockWorkflow, error: null });
      
      // Call fetchWorkflow
      // @ts-ignore - private method
      const result = await executionWorker.fetchWorkflow('test-workflow-id');
      
      // Verify that the workflow service was called
      expect(workflowService.getWorkflow).toHaveBeenCalledWith('test-workflow-id');
      
      // Verify that the correct workflow was returned
      expect(result).toEqual(mockWorkflow);
    });
    
    it('should handle errors when fetching a workflow', async () => {
      // Mock the workflow service to return an error
      workflowService.getWorkflow.mockResolvedValue({ data: null, error: 'Workflow not found' });
      
      // Call fetchWorkflow and expect it to throw
      // @ts-ignore - private method
      await expect(executionWorker.fetchWorkflow('test-workflow-id')).rejects.toThrow();
    });
  });

  describe('fetchOrCreateProfile', () => {
    it('should fetch an existing profile', async () => {
      // Mock the profile data
      const mockProfile = createMockProfile();
      
      // Mock Supabase response
      mockSupabase.setResponse({ data: [mockProfile], error: null });
      
      // Call fetchOrCreateProfile
      // @ts-ignore - private method
      const result = await executionWorker.fetchOrCreateProfile('test-user-id', mockSupabase.client);
      
      // Verify that Supabase was queried for the profile
      expect(mockSupabase.client.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.mocks.select).toHaveBeenCalled();
      expect(mockSupabase.mocks.eq).toHaveBeenCalledWith('id', 'test-user-id');
      
      // Verify that the correct profile was returned
      expect(result).toEqual(mockProfile);
    });
    
    it('should create a profile if one does not exist', async () => {
      // Mock Supabase responses
      // For profile query - return empty
      mockSupabase.setResponse({ data: [], error: null });
      // For profile creation
      mockSupabase.setResponse({ data: null, error: null });
      
      // Call fetchOrCreateProfile
      // @ts-ignore - private method
      const result = await executionWorker.fetchOrCreateProfile('test-user-id', mockSupabase.client);
      
      // Verify that a profile was created
      expect(mockSupabase.client.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.mocks.insert).toHaveBeenCalled();
      
      // Verify that the default profile was returned
      expect(result).toEqual(expect.objectContaining({
        id: 'test-user-id',
        monthly_execution_count: 0,
        monthly_execution_quota: 100,
      }));
    });
    
    it('should handle errors when fetching a profile', async () => {
      // Mock Supabase to return an error
      mockSupabase.setResponse({ data: null, error: { message: 'Database error' } });
      
      // Call fetchOrCreateProfile and expect it to throw
      // @ts-ignore - private method
      await expect(executionWorker.fetchOrCreateProfile('test-user-id', mockSupabase.client)).rejects.toThrow();
    });
    
    it('should handle errors when creating a profile', async () => {
      // Mock Supabase responses
      // For profile query - return empty
      mockSupabase.setResponse({ data: [], error: null });
      // For profile creation - return an error
      mockSupabase.setResponse({ data: null, error: { message: 'Failed to create profile' } });
      
      // Call fetchOrCreateProfile and expect it to throw
      // @ts-ignore - private method
      await expect(executionWorker.fetchOrCreateProfile('test-user-id', mockSupabase.client)).rejects.toThrow();
    });
  });

  describe('extractNodesAndEdges', () => {
    it('should extract nodes and edges from workflow.nodes and workflow.edges', () => {
      // Create a mock workflow with nodes and edges directly
      const mockWorkflow = {
        nodes: [{ id: 'node1' }],
        edges: [{ id: 'edge1' }],
      };
      
      // Call extractNodesAndEdges
      // @ts-ignore - private method
      const result = executionWorker.extractNodesAndEdges(mockWorkflow);
      
      // Verify that nodes and edges were extracted correctly
      expect(result).toEqual({
        nodes: [{ id: 'node1' }],
        edges: [{ id: 'edge1' }],
      });
    });
    
    it('should extract nodes and edges from workflow.flow_data', () => {
      // Create a mock workflow with flow_data
      const mockWorkflow = {
        flow_data: {
          nodes: [{ id: 'node1' }],
          edges: [{ id: 'edge1' }],
        },
      };
      
      // Call extractNodesAndEdges
      // @ts-ignore - private method
      const result = executionWorker.extractNodesAndEdges(mockWorkflow);
      
      // Verify that nodes and edges were extracted correctly
      expect(result).toEqual({
        nodes: [{ id: 'node1' }],
        edges: [{ id: 'edge1' }],
      });
    });
    
    it('should extract nodes and edges from workflow.definition', () => {
      // Create a mock workflow with definition as a string
      const mockWorkflow = {
        definition: JSON.stringify({
          nodes: [{ id: 'node1' }],
          edges: [{ id: 'edge1' }],
        }),
      };
      
      // Call extractNodesAndEdges
      // @ts-ignore - private method
      const result = executionWorker.extractNodesAndEdges(mockWorkflow);
      
      // Verify that nodes and edges were extracted correctly
      expect(result).toEqual({
        nodes: [{ id: 'node1' }],
        edges: [{ id: 'edge1' }],
      });
    });
    
    it('should extract nodes and edges from workflow.definition as an object', () => {
      // Create a mock workflow with definition as an object
      const mockWorkflow = {
        definition: {
          nodes: [{ id: 'node1' }],
          edges: [{ id: 'edge1' }],
        },
      };
      
      // Call extractNodesAndEdges
      // @ts-ignore - private method
      const result = executionWorker.extractNodesAndEdges(mockWorkflow);
      
      // Verify that nodes and edges were extracted correctly
      expect(result).toEqual({
        nodes: [{ id: 'node1' }],
        edges: [{ id: 'edge1' }],
      });
    });
    
    it('should throw an error if nodes and edges are missing', () => {
      // Create a mock workflow with no nodes or edges
      const mockWorkflow = {};
      
      // Call extractNodesAndEdges and expect it to throw
      // @ts-ignore - private method
      expect(() => executionWorker.extractNodesAndEdges(mockWorkflow)).toThrow();
    });
  });
});
