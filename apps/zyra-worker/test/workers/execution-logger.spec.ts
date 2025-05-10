import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { ExecutionLogger } from '../../src/workers/execution-logger';
import { createMockSupabaseClient } from '../utils/mocks';

describe('ExecutionLogger', () => {
  let executionLogger: ExecutionLogger;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(async () => {
    // Create mocks
    mockSupabase = createMockSupabaseClient();
    
    // Create the testing module
    const moduleRef = await Test.createTestingModule({
      providers: [ExecutionLogger],
    }).compile();
    
    // Get the service instance
    executionLogger = moduleRef.get<ExecutionLogger>(ExecutionLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logExecutionEvent', () => {
    it('should log an execution event', async () => {
      // Mock Supabase response
      mockSupabase.setResponse({ data: { id: 'log1' }, error: null });
      
      // Call logExecutionEvent
      await executionLogger.logExecutionEvent(
        mockSupabase.client,
        'test-execution-id',
        {
          level: 'info',
          message: 'Execution started',
          node_id: 'system',
          data: { key: 'value' },
        }
      );
      
      // Verify that Supabase was called to insert a log
      expect(mockSupabase.client.from).toHaveBeenCalledWith('execution_logs');
      expect(mockSupabase.mocks.insert).toHaveBeenCalledWith({
        execution_id: 'test-execution-id',
        level: 'info',
        message: 'Execution started',
        node_id: 'system',
        data: { key: 'value' },
        timestamp: expect.any(String),
      });
    });
    
    it('should handle errors when logging an execution event', async () => {
      // Mock Supabase to return an error
      mockSupabase.setResponse({ data: null, error: { message: 'Database error' } });
      
      // Call logExecutionEvent
      await executionLogger.logExecutionEvent(
        mockSupabase.client,
        'test-execution-id',
        {
          level: 'info',
          message: 'Execution started',
          node_id: 'system',
        }
      );
      
      // No assertions needed - the method should handle the error gracefully
    });
    
    it('should log an execution event with minimal data', async () => {
      // Mock Supabase response
      mockSupabase.setResponse({ data: { id: 'log1' }, error: null });
      
      // Call logExecutionEvent with minimal data
      await executionLogger.logExecutionEvent(
        mockSupabase.client,
        'test-execution-id',
        {
          level: 'info',
          message: 'Execution started',
          node_id: 'system',
        }
      );
      
      // Verify that Supabase was called to insert a log
      expect(mockSupabase.client.from).toHaveBeenCalledWith('execution_logs');
      expect(mockSupabase.mocks.insert).toHaveBeenCalledWith({
        execution_id: 'test-execution-id',
        level: 'info',
        message: 'Execution started',
        node_id: 'system',
        data: null,
        timestamp: expect.any(String),
      });
    });
  });

  describe('logNodeEvent', () => {
    it('should log a node event', async () => {
      // Mock Supabase response
      mockSupabase.setResponse({ data: { id: 'log1' }, error: null });
      
      // Call logNodeEvent
      await executionLogger.logNodeEvent(
        mockSupabase.client,
        'test-execution-id',
        'node1',
        'info',
        'Node execution started',
        { key: 'value' }
      );
      
      // Verify that Supabase was called to insert a log
      expect(mockSupabase.client.from).toHaveBeenCalledWith('execution_logs');
      expect(mockSupabase.mocks.insert).toHaveBeenCalledWith({
        execution_id: 'test-execution-id',
        level: 'info',
        message: 'Node execution started',
        node_id: 'node1',
        data: { key: 'value' },
        timestamp: expect.any(String),
      });
    });
    
    it('should handle errors when logging a node event', async () => {
      // Mock Supabase to return an error
      mockSupabase.setResponse({ data: null, error: { message: 'Database error' } });
      
      // Call logNodeEvent
      await executionLogger.logNodeEvent(
        mockSupabase.client,
        'test-execution-id',
        'node1',
        'info',
        'Node execution started'
      );
      
      // No assertions needed - the method should handle the error gracefully
    });
    
    it('should log a node event with minimal data', async () => {
      // Mock Supabase response
      mockSupabase.setResponse({ data: { id: 'log1' }, error: null });
      
      // Call logNodeEvent with minimal data
      await executionLogger.logNodeEvent(
        mockSupabase.client,
        'test-execution-id',
        'node1',
        'info',
        'Node execution started'
      );
      
      // Verify that Supabase was called to insert a log
      expect(mockSupabase.client.from).toHaveBeenCalledWith('execution_logs');
      expect(mockSupabase.mocks.insert).toHaveBeenCalledWith({
        execution_id: 'test-execution-id',
        level: 'info',
        message: 'Node execution started',
        node_id: 'node1',
        data: null,
        timestamp: expect.any(String),
      });
    });
  });
});
