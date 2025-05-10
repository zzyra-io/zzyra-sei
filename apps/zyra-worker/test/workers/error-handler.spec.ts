import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { ErrorHandler } from '../../src/workers/error-handler';
import { ExecutionLogger } from '../../src/workers/execution-logger';
import { NotificationService } from '../../src/services/notification.service';
import { createMockSupabaseClient } from '../utils/mocks';
import * as serviceClient from '../../src/lib/supabase/serviceClient';

// Mock the createServiceClient function
jest.mock('../../src/lib/supabase/serviceClient', () => ({
  createServiceClient: jest.fn(),
}));

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let executionLogger: jest.Mocked<ExecutionLogger>;
  let notificationService: jest.Mocked<NotificationService>;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(async () => {
    // Create mocks
    mockSupabase = createMockSupabaseClient();
    
    // Mock the createServiceClient function to return our mock Supabase client
    (serviceClient.createServiceClient as jest.Mock).mockReturnValue(mockSupabase.client);
    
    // Create mock services
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
        ErrorHandler,
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
    errorHandler = moduleRef.get<ErrorHandler>(ErrorHandler);
    executionLogger = moduleRef.get(ExecutionLogger) as jest.Mocked<ExecutionLogger>;
    notificationService = moduleRef.get(NotificationService) as jest.Mocked<NotificationService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleJobFailure', () => {
    it('should handle a job failure', async () => {
      // Mock Supabase responses
      mockSupabase.setResponse({ data: null, error: null });
      
      // Create an error
      const error = new Error('Job failed');
      
      // Call handleJobFailure
      await errorHandler.handleJobFailure(
        error,
        'test-execution-id',
        'test-user-id'
      );
      
      // Verify that Supabase was called to update the execution status
      expect(mockSupabase.client.from).toHaveBeenCalledWith('workflow_executions');
      expect(mockSupabase.mocks.update).toHaveBeenCalledWith({
        status: 'failed',
        error: 'Job failed',
        completed_at: expect.any(String),
      });
      expect(mockSupabase.mocks.eq).toHaveBeenCalledWith('id', 'test-execution-id');
      
      // Verify that an execution event was logged
      expect(executionLogger.logExecutionEvent).toHaveBeenCalledWith(
        mockSupabase.client,
        'test-execution-id',
        {
          level: 'error',
          message: 'Execution failed: Job failed',
          node_id: 'system',
          data: { error: 'Job failed' },
        }
      );
      
      // Verify that a notification was sent
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        'test-user-id',
        'workflow_failed',
        expect.objectContaining({
          execution_id: 'test-execution-id',
          error: 'Job failed',
        })
      );
    });
    
    it('should handle a job failure with a non-Error object', async () => {
      // Mock Supabase responses
      mockSupabase.setResponse({ data: null, error: null });
      
      // Call handleJobFailure with a string error
      await errorHandler.handleJobFailure(
        'String error message' as any,
        'test-execution-id',
        'test-user-id'
      );
      
      // Verify that Supabase was called to update the execution status
      expect(mockSupabase.client.from).toHaveBeenCalledWith('workflow_executions');
      expect(mockSupabase.mocks.update).toHaveBeenCalledWith({
        status: 'failed',
        error: 'String error message',
        completed_at: expect.any(String),
      });
      
      // Verify that an execution event was logged
      expect(executionLogger.logExecutionEvent).toHaveBeenCalledWith(
        mockSupabase.client,
        'test-execution-id',
        {
          level: 'error',
          message: 'Execution failed: String error message',
          node_id: 'system',
          data: { error: 'String error message' },
        }
      );
    });
    
    it('should handle errors when updating the execution status', async () => {
      // Mock Supabase to return an error
      mockSupabase.setResponse({ data: null, error: { message: 'Database error' } });
      
      // Create an error
      const error = new Error('Job failed');
      
      // Call handleJobFailure
      await errorHandler.handleJobFailure(
        error,
        'test-execution-id',
        'test-user-id'
      );
      
      // Verify that an execution event was still logged
      expect(executionLogger.logExecutionEvent).toHaveBeenCalled();
      
      // Verify that a notification was still sent
      expect(notificationService.sendNotification).toHaveBeenCalled();
    });
    
    it('should handle errors when logging the execution event', async () => {
      // Mock Supabase responses
      mockSupabase.setResponse({ data: null, error: null });
      
      // Mock executionLogger to throw an error
      executionLogger.logExecutionEvent.mockRejectedValue(new Error('Logging error'));
      
      // Create an error
      const error = new Error('Job failed');
      
      // Call handleJobFailure
      await errorHandler.handleJobFailure(
        error,
        'test-execution-id',
        'test-user-id'
      );
      
      // Verify that Supabase was still called to update the execution status
      expect(mockSupabase.client.from).toHaveBeenCalledWith('workflow_executions');
      
      // Verify that a notification was still sent
      expect(notificationService.sendNotification).toHaveBeenCalled();
    });
    
    it('should handle errors when sending a notification', async () => {
      // Mock Supabase responses
      mockSupabase.setResponse({ data: null, error: null });
      
      // Mock notificationService to throw an error
      notificationService.sendNotification.mockRejectedValue(new Error('Notification error'));
      
      // Create an error
      const error = new Error('Job failed');
      
      // Call handleJobFailure
      await errorHandler.handleJobFailure(
        error,
        'test-execution-id',
        'test-user-id'
      );
      
      // Verify that Supabase was still called to update the execution status
      expect(mockSupabase.client.from).toHaveBeenCalledWith('workflow_executions');
      
      // Verify that an execution event was still logged
      expect(executionLogger.logExecutionEvent).toHaveBeenCalled();
    });
  });
});
