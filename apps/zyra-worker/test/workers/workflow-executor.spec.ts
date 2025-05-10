import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { WorkflowExecutor } from '../../src/workers/workflow-executor';
import { NodeExecutor } from '../../src/workers/node-executor';
import { ExecutionLogger } from '../../src/workers/execution-logger';
import { NotificationService } from '../../src/services/notification.service';
import { 
  createMockSupabaseClient,
  createMockWorkflow,
  createMockExecution
} from '../utils/mocks';
import * as serviceClient from '../../src/lib/supabase/serviceClient';

import { BlockType } from '@zyra/types';


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

describe('WorkflowExecutor', () => {
  let workflowExecutor: WorkflowExecutor;
  let nodeExecutor: jest.Mocked<NodeExecutor>;
  let executionLogger: jest.Mocked<ExecutionLogger>;
  let notificationService: jest.Mocked<NotificationService>;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  // Sample workflow data
  const sampleNodes = [
    {
      id: 'node1',
      type: 'input',
      data: { type: BlockType.WEBHOOK, label: 'Start' },
      position: { x: 0, y: 0 },
    },
    {
      id: 'node2',
      type: 'default',
      data: { type: BlockType.EMAIL, label: 'Send Email', to: 'test@example.com', subject: 'Test', body: 'Test body' },
      position: { x: 200, y: 0 },
    },
    {
      id: 'node3',
      type: 'output',
      data: { type: BlockType.EMAIL, label: 'End' },
      position: { x: 400, y: 0 },
    },
  ];

  const sampleEdges = [
    { id: 'edge1', source: 'node1', target: 'node2' },
    { id: 'edge2', source: 'node2', target: 'node3' },
  ];

  beforeEach(async () => {
    // Create mocks
    mockSupabase = createMockSupabaseClient();
    
    // Mock the createServiceClient function to return our mock Supabase client
    (serviceClient.createServiceClient as jest.Mock).mockReturnValue(mockSupabase.client);
    
    // Create mock services
    const mockNodeExecutor = {
      executeNode: jest.fn(),
    };
    
    const mockExecutionLogger = {
      logExecutionEvent: jest.fn(),
      logNodeEvent: jest.fn(),
    };
    
    const mockNotificationService = {
      sendNotification: jest.fn(),
    };
    
    // Create the testing module
    const moduleRef = await Test.createTestingModule({
      providers: [
        WorkflowExecutor,
        {
          provide: NodeExecutor,
          useValue: mockNodeExecutor,
        },
        {
          provide: ExecutionLogger,
          useValue: mockExecutionLogger,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();
    
    // Get the service instance
    workflowExecutor = moduleRef.get<WorkflowExecutor>(WorkflowExecutor);
    nodeExecutor = moduleRef.get(NodeExecutor) as jest.Mocked<NodeExecutor>;
    executionLogger = moduleRef.get(ExecutionLogger) as jest.Mocked<ExecutionLogger>;
    notificationService = moduleRef.get(NotificationService) as jest.Mocked<NotificationService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('buildNodeDependencyMap', () => {
    it('should build a dependency map based on edges', () => {
      // Call buildNodeDependencyMap
      // @ts-ignore - private method
      const dependencyMap = workflowExecutor.buildNodeDependencyMap(sampleNodes, sampleEdges);
      
      // Verify that the dependency map was built correctly
      expect(dependencyMap.get('node1')).toEqual([]);
      expect(dependencyMap.get('node2')).toEqual(['node1']);
      expect(dependencyMap.get('node3')).toEqual(['node2']);
    });
    
    it('should handle multiple dependencies for a node', () => {
      // Create edges with multiple dependencies
      const edges = [
        { id: 'edge1', source: 'node1', target: 'node3' },
        { id: 'edge2', source: 'node2', target: 'node3' },
      ];
      
      // Call buildNodeDependencyMap
      // @ts-ignore - private method
      const dependencyMap = workflowExecutor.buildNodeDependencyMap(sampleNodes, edges);
      
      // Verify that the dependency map was built correctly
      expect(dependencyMap.get('node1')).toEqual([]);
      expect(dependencyMap.get('node2')).toEqual([]);
      expect(dependencyMap.get('node3')).toEqual(['node1', 'node2']);
    });
    
    it('should handle empty edges', () => {
      // Call buildNodeDependencyMap with empty edges
      // @ts-ignore - private method
      const dependencyMap = workflowExecutor.buildNodeDependencyMap(sampleNodes, []);
      
      // Verify that all nodes have empty dependencies
      expect(dependencyMap.get('node1')).toEqual([]);
      expect(dependencyMap.get('node2')).toEqual([]);
      expect(dependencyMap.get('node3')).toEqual([]);
    });
  });

  describe('getRelevantOutputs', () => {
    it('should get outputs relevant to a node based on its dependencies', () => {
      // Create a dependency map
      const dependencyMap = new Map();
      dependencyMap.set('node1', []);
      dependencyMap.set('node2', ['node1']);
      dependencyMap.set('node3', ['node2']);
      
      // Create outputs
      const allOutputs = {
        node1: { result: 'node1-result' },
        node2: { result: 'node2-result' },
        node3: { result: 'node3-result' },
      };
      
      // Call getRelevantOutputs for node2
      // @ts-ignore - private method
      const relevantOutputs = workflowExecutor.getRelevantOutputs('node2', dependencyMap, allOutputs);
      
      // Verify that only node1's outputs are included
      expect(relevantOutputs).toEqual({ node1: { result: 'node1-result' } });
    });
    
    it('should handle nodes with multiple dependencies', () => {
      // Create a dependency map with multiple dependencies
      const dependencyMap = new Map();
      dependencyMap.set('node1', []);
      dependencyMap.set('node2', []);
      dependencyMap.set('node3', ['node1', 'node2']);
      
      // Create outputs
      const allOutputs = {
        node1: { result: 'node1-result' },
        node2: { result: 'node2-result' },
        node3: { result: 'node3-result' },
      };
      
      // Call getRelevantOutputs for node3
      // @ts-ignore - private method
      const relevantOutputs = workflowExecutor.getRelevantOutputs('node3', dependencyMap, allOutputs);
      
      // Verify that both node1 and node2's outputs are included
      expect(relevantOutputs).toEqual({
        node1: { result: 'node1-result' },
        node2: { result: 'node2-result' },
      });
    });
    
    it('should handle nodes with no dependencies', () => {
      // Create a dependency map
      const dependencyMap = new Map();
      dependencyMap.set('node1', []);
      
      // Create outputs
      const allOutputs = {
        node1: { result: 'node1-result' },
      };
      
      // Call getRelevantOutputs for node1
      // @ts-ignore - private method
      const relevantOutputs = workflowExecutor.getRelevantOutputs('node1', dependencyMap, allOutputs);
      
      // Verify that no outputs are included
      expect(relevantOutputs).toEqual({});
    });
    
    it('should handle missing outputs for dependencies', () => {
      // Create a dependency map
      const dependencyMap = new Map();
      dependencyMap.set('node1', []);
      dependencyMap.set('node2', ['node1']);
      
      // Create outputs with missing node1
      const allOutputs = {
        node2: { result: 'node2-result' },
      };
      
      // Call getRelevantOutputs for node2
      // @ts-ignore - private method
      const relevantOutputs = workflowExecutor.getRelevantOutputs('node2', dependencyMap, allOutputs);
      
      // Verify that no outputs are included
      expect(relevantOutputs).toEqual({});
    });
  });

  describe('executeWorkflow', () => {
    it('should execute a workflow successfully', async () => {
      // Mock node executor to return successful results
      nodeExecutor.executeNode.mockImplementation((node) => {
        return Promise.resolve({ result: `${node.id}-result` });
      });
      
      // Mock Supabase responses
      // For workflow execution data
      mockSupabase.setResponse({ 
        data: { workflow_id: 'test-workflow-id', workflows: { name: 'Test Workflow' } }, 
        error: null 
      });
      
      // Call executeWorkflow
      const result = await workflowExecutor.executeWorkflow(
        sampleNodes,
        sampleEdges,
        'test-execution-id',
        'test-user-id'
      );
      
      // Verify that the workflow was executed successfully
      expect(result.status).toBe('completed');
      expect(result.error).toBeNull();
      
      // Verify that all nodes were executed
      expect(nodeExecutor.executeNode).toHaveBeenCalledTimes(3);
      
      // Verify that execution events were logged
      expect(executionLogger.logExecutionEvent).toHaveBeenCalled();
      
      // Verify that a notification was sent
      expect(notificationService.sendNotification).toHaveBeenCalled();
    });
    
    it('should handle node execution failures', async () => {
      // Mock node executor to fail for node2
      nodeExecutor.executeNode.mockImplementation((node) => {
        if (node.id === 'node2') {
          return Promise.reject(new Error('Node execution failed'));
        }
        return Promise.resolve({ result: `${node.id}-result` });
      });
      
      // Mock Supabase responses
      // For workflow execution data
      mockSupabase.setResponse({ 
        data: { workflow_id: 'test-workflow-id', workflows: { name: 'Test Workflow' } }, 
        error: null 
      });
      
      // Call executeWorkflow
      const result = await workflowExecutor.executeWorkflow(
        sampleNodes,
        sampleEdges,
        'test-execution-id',
        'test-user-id'
      );
      
      // Verify that the workflow failed
      expect(result.status).toBe('failed');
      expect(result.error).not.toBeNull();
      
      // Verify that execution events were logged
      expect(executionLogger.logExecutionEvent).toHaveBeenCalled();
      
      // Verify that a notification was sent
      expect(notificationService.sendNotification).toHaveBeenCalled();
    });
    
    it('should handle workflow validation failures', async () => {
      // Create an invalid workflow with a cycle
      const nodesWithCycle = [...sampleNodes];
      const edgesWithCycle = [
        ...sampleEdges,
        { id: 'edge3', source: 'node3', target: 'node1' }, // Creates a cycle
      ];
      
      // Mock Supabase responses
      // For workflow execution data
      mockSupabase.setResponse({ 
        data: { workflow_id: 'test-workflow-id', workflows: { name: 'Test Workflow' } }, 
        error: null 
      });
      
      // Call executeWorkflow
      const result = await workflowExecutor.executeWorkflow(
        nodesWithCycle,
        edgesWithCycle,
        'test-execution-id',
        'test-user-id'
      );
      
      // Verify that the workflow failed due to validation
      expect(result.status).toBe('failed');
      expect(result.error).toContain('cycle');
      
      // Verify that no nodes were executed
      expect(nodeExecutor.executeNode).not.toHaveBeenCalled();
      
      // Verify that execution events were logged
      expect(executionLogger.logExecutionEvent).toHaveBeenCalled();
      
      // Verify that a notification was sent
      expect(notificationService.sendNotification).toHaveBeenCalled();
    });
    
    it('should handle workflows with orphaned nodes', async () => {
      // Create a workflow with an orphaned node
      const nodesWithOrphan = [
        ...sampleNodes,
        {
          id: 'node4',
          type: 'default',
          data: { type: BlockType.EMAIL, label: 'Orphaned Node' },
          position: { x: 600, y: 0 },
        },
      ];
      
      // Mock Supabase responses
      // For workflow execution data
      mockSupabase.setResponse({ 
        data: { workflow_id: 'test-workflow-id', workflows: { name: 'Test Workflow' } }, 
        error: null 
      });
      
      // Call executeWorkflow
      const result = await workflowExecutor.executeWorkflow(
        nodesWithOrphan,
        sampleEdges,
        'test-execution-id',
        'test-user-id'
      );
      
      // Verify that the workflow failed due to validation
      expect(result.status).toBe('failed');
      expect(result.error).toContain('orphaned');
      
      // Verify that no nodes were executed
      expect(nodeExecutor.executeNode).not.toHaveBeenCalled();
      
      // Verify that execution events were logged
      expect(executionLogger.logExecutionEvent).toHaveBeenCalled();
      
      // Verify that a notification was sent
      expect(notificationService.sendNotification).toHaveBeenCalled();
    });
    
    it('should handle workflows with missing terminal nodes', async () => {
      // Create a workflow without an output node
      const nodesWithoutOutput = [
        {
          id: 'node1',
          type: 'input',
          data: { type: BlockType.WEBHOOK, label: 'Start' },
          position: { x: 0, y: 0 },
        },
        {
          id: 'node2',
          type: 'default',
          data: { type: BlockType.EMAIL, label: 'Send Email' },
          position: { x: 200, y: 0 },
        },
      ];
      
      const edgesWithoutOutput = [
        { id: 'edge1', source: 'node1', target: 'node2' },
      ];
      
      // Mock Supabase responses
      // For workflow execution data
      mockSupabase.setResponse({ 
        data: { workflow_id: 'test-workflow-id', workflows: { name: 'Test Workflow' } }, 
        error: null 
      });
      
      // Call executeWorkflow
      const result = await workflowExecutor.executeWorkflow(
        nodesWithoutOutput,
        edgesWithoutOutput,
        'test-execution-id',
        'test-user-id'
      );
      
      // Verify that the workflow failed due to validation
      expect(result.status).toBe('failed');
      expect(result.error).toContain('terminal');
      
      // Verify that no nodes were executed
      expect(nodeExecutor.executeNode).not.toHaveBeenCalled();
      
      // Verify that execution events were logged
      expect(executionLogger.logExecutionEvent).toHaveBeenCalled();
      
      // Verify that a notification was sent
      expect(notificationService.sendNotification).toHaveBeenCalled();
    });
    
    it('should execute nodes in topological order', async () => {
      // Track the order of node execution
      const executionOrder: string[] = [];
      
      // Mock node executor to track execution order
      nodeExecutor.executeNode.mockImplementation((node) => {
        executionOrder.push(node.id);
        return Promise.resolve({ result: `${node.id}-result` });
      });
      
      // Mock Supabase responses
      // For workflow execution data
      mockSupabase.setResponse({ 
        data: { workflow_id: 'test-workflow-id', workflows: { name: 'Test Workflow' } }, 
        error: null 
      });
      
      // Call executeWorkflow
      await workflowExecutor.executeWorkflow(
        sampleNodes,
        sampleEdges,
        'test-execution-id',
        'test-user-id'
      );
      
      // Verify that nodes were executed in topological order
      expect(executionOrder).toEqual(['node1', 'node2', 'node3']);
    });
    
    it('should resume workflow execution from a specific node', async () => {
      // Track the order of node execution
      const executionOrder: string[] = [];
      
      // Mock node executor to track execution order
      nodeExecutor.executeNode.mockImplementation((node) => {
        executionOrder.push(node.id);
        return Promise.resolve({ result: `${node.id}-result` });
      });
      
      // Mock Supabase responses
      // For workflow execution data
      mockSupabase.setResponse({ 
        data: { workflow_id: 'test-workflow-id', workflows: { name: 'Test Workflow' } }, 
        error: null 
      });
      
      // Call executeWorkflow with resumeFromNodeId
      await workflowExecutor.executeWorkflow(
        sampleNodes,
        sampleEdges,
        'test-execution-id',
        'test-user-id',
        'node2', // Resume from node2
        { node1: { result: 'node1-result' } } // Provide resume data
      );
      
      // Verify that only node2 and node3 were executed
      expect(executionOrder).toEqual(['node2', 'node3']);
      expect(nodeExecutor.executeNode).toHaveBeenCalledTimes(2);
    });
    
    it('should handle paused workflows', async () => {
      // Mock node executor to pause at node2
      nodeExecutor.executeNode.mockImplementation((node) => {
        if (node.id === 'node2') {
          throw new Error('Node node2 is paused');
        }
        return Promise.resolve({ result: `${node.id}-result` });
      });
      
      // Mock Supabase responses
      // For workflow execution data
      mockSupabase.setResponse({ 
        data: { workflow_id: 'test-workflow-id', workflows: { name: 'Test Workflow' } }, 
        error: null 
      });
      
      // Call executeWorkflow
      const result = await workflowExecutor.executeWorkflow(
        sampleNodes,
        sampleEdges,
        'test-execution-id',
        'test-user-id'
      );
      
      // Verify that the workflow was paused
      expect(result.status).toBe('paused');
      
      // Verify that execution events were logged
      expect(executionLogger.logExecutionEvent).toHaveBeenCalled();
      
      // Verify that a notification was sent
      expect(notificationService.sendNotification).toHaveBeenCalled();
    });
  });

  describe('cleanupActiveNodeExecutions', () => {
    it('should clean up active node executions', async () => {
      // Create a set of active node executions
      const activeNodeExecutions = new Set(['node1', 'node2']);
      
      // Call cleanupActiveNodeExecutions
      // @ts-ignore - private method
      await workflowExecutor.cleanupActiveNodeExecutions(
        mockSupabase.client,
        'test-execution-id',
        activeNodeExecutions,
        'Workflow failed'
      );
      
      // Verify that Supabase was called to update node executions
      expect(mockSupabase.client.from).toHaveBeenCalledWith('node_executions');
      expect(mockSupabase.mocks.update).toHaveBeenCalled();
      
      // Verify that node events were logged
      expect(executionLogger.logNodeEvent).toHaveBeenCalledTimes(2);
    });
    
    it('should do nothing if there are no active node executions', async () => {
      // Create an empty set of active node executions
      const activeNodeExecutions = new Set();
      
      // Call cleanupActiveNodeExecutions
      // @ts-ignore - private method
      await workflowExecutor.cleanupActiveNodeExecutions(
        mockSupabase.client,
        'test-execution-id',
        activeNodeExecutions,
        'Workflow failed'
      );
      
      // Verify that Supabase was not called
      expect(mockSupabase.client.from).not.toHaveBeenCalled();
      
      // Verify that no node events were logged
      expect(executionLogger.logNodeEvent).not.toHaveBeenCalled();
    });
    
    it('should handle errors during cleanup', async () => {
      // Create a set of active node executions
      const activeNodeExecutions = new Set(['node1']);
      
      // Mock Supabase as any
      mockSupabase.client.from = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });
      
      // Call cleanupActiveNodeExecutions
      // @ts-ignore - private method
      await workflowExecutor.cleanupActiveNodeExecutions(
        mockSupabase.client,
        'test-execution-id',
        activeNodeExecutions,
        'Workflow failed'
      );
      
      // Verify that the error was handled and the function didn't throw
      expect(executionLogger.logNodeEvent).not.toHaveBeenCalled();
    });
  });
});
