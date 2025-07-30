import { jest } from '@jest/globals';
import { TestBlockExecutionContext } from '../../utils/test-types';
import { Test } from '@nestjs/testing';
import { NotificationBlockHandler } from '../../../src/workers/handlers/NotificationBlockHandler';

import { Logger } from '@nestjs/common';
import { NotificationService } from '../../../src/services/notification.service';
import { createMockSupabaseClient } from '../../utils/mocks';
import * as serviceClient from '../../../src/lib/supabase/serviceClient';
import { BlockHandler } from '@zyra/types';

// Mock the createServiceClient function
jest.mock('../../../src/lib/supabase/serviceClient', () => ({
  createServiceClient: jest.fn(),
}));

describe('NotificationBlockHandler', () => {
  let notificationBlockHandler: NotificationBlockHandler;
  let mockLogger: jest.Mocked<Logger>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(async () => {
    // Create mocks
    mockSupabase = createMockSupabaseClient();
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    mockNotificationService = {
      sendNotification: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<NotificationService>;

    // Mock the createServiceClient function to return our mock Supabase client
    (serviceClient.createServiceClient as jest.Mock).mockReturnValue(
      mockSupabase.client,
    );

    // Create the testing module
    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: NotificationBlockHandler,
          useFactory: () =>
            new NotificationBlockHandler(
              mockLogger as any,
              mockNotificationService as any,
            ),
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    // Get the service instance
    notificationBlockHandler = moduleRef.get<NotificationBlockHandler>(
      NotificationBlockHandler,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should send a notification successfully', async () => {
      // Create a mock execution context
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          type: 'custom',
          title: 'Test Notification',
          message: 'This is a test notification',
          channel: 'email',
          recipients: ['user@example.com'],
          config: {
            priority: 'high',
          },
        },
        inputs: {},
      };

      // Execute the block
      const result = await notificationBlockHandler.execute(context, {} as any);

      // Verify that the notification was sent successfully
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        sent: true,
        recipients: ['user@example.com'],
        channel: 'email',
      });

      // Verify that the notification service was called with the correct parameters
      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        'test-user-id',
        'custom',
        {
          title: 'Test Notification',
          message: 'This is a test notification',
          recipients: ['user@example.com'],
          channel: 'email',
          priority: 'high',
          execution_id: 'test-execution-id',
          node_id: 'test-node-id',
        },
      );
    });

    it('should handle notification sending failures', async () => {
      // Mock the notification service to throw an error
      mockNotificationService.sendNotification.mockRejectedValueOnce(
        new Error('Failed to send notification'),
      );

      // Create a mock execution context
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          type: 'custom',
          title: 'Test Notification',
          message: 'This is a test notification',
          channel: 'email',
          recipients: ['user@example.com'],
        },
        inputs: {},
      };

      // Execute the block and expect it to throw
      await expect(
        notificationBlockHandler.execute(context, {} as any),
      ).rejects.toThrow('Failed to send notification');
    });

    it('should handle missing notification type', async () => {
      // Create a mock execution context with missing type
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          title: 'Test Notification',
          message: 'This is a test notification',
          channel: 'email',
          recipients: ['user@example.com'],
        },
        inputs: {},
      };

      // Execute the block and expect it to throw
      await expect(
        notificationBlockHandler.execute(context, {} as any),
      ).rejects.toThrow('Notification type is required');
    });

    it('should handle missing notification title', async () => {
      // Create a mock execution context with missing title
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          type: 'custom',
          message: 'This is a test notification',
          channel: 'email',
          recipients: ['user@example.com'],
        },
        inputs: {},
      };

      // Execute the block and expect it to throw
      await expect(
        notificationBlockHandler.execute(context, {} as any),
      ).rejects.toThrow('Notification title is required');
    });

    it('should handle missing notification message', async () => {
      // Create a mock execution context with missing message
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          type: 'custom',
          title: 'Test Notification',
          channel: 'email',
          recipients: ['user@example.com'],
        },
        inputs: {},
      };

      // Execute the block and expect it to throw
      await expect(
        notificationBlockHandler.execute(context, {} as any),
      ).rejects.toThrow('Notification message is required');
    });

    it('should handle missing notification channel', async () => {
      // Create a mock execution context with missing channel
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          type: 'custom',
          title: 'Test Notification',
          message: 'This is a test notification',
          recipients: ['user@example.com'],
        },
        inputs: {},
      };

      // Execute the block and expect it to throw
      await expect(
        notificationBlockHandler.execute(context, {} as any),
      ).rejects.toThrow('Notification channel is required');
    });

    it('should handle invalid notification channel', async () => {
      // Create a mock execution context with an invalid channel
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          type: 'custom',
          title: 'Test Notification',
          message: 'This is a test notification',
          channel: 'invalid-channel',
          recipients: ['user@example.com'],
        },
        inputs: {},
      };

      // Execute the block and expect it to throw
      await expect(
        notificationBlockHandler.execute(context, {} as any),
      ).rejects.toThrow('Invalid notification channel');
    });

    it('should handle missing recipients', async () => {
      // Create a mock execution context with missing recipients
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          type: 'custom',
          title: 'Test Notification',
          message: 'This is a test notification',
          channel: 'email',
          recipients: [],
        },
        inputs: {},
      };

      // Execute the block and expect it to throw
      await expect(
        notificationBlockHandler.execute(context, {} as any),
      ).rejects.toThrow('At least one recipient is required');
    });

    it('should handle dynamic recipients from previous blocks', async () => {
      // Create a mock execution context with dynamic recipients
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          type: 'custom',
          title: 'Test Notification',
          message: 'This is a test notification',
          channel: 'email',
          recipients: ['{{prevNode.email}}'],
        },
        inputs: {
          prevNode: {
            email: 'dynamic@example.com',
          },
        },
      };

      // Execute the block
      const result = await notificationBlockHandler.execute(context, {} as any);

      // Verify that the notification was sent successfully
      expect(result.success).toBe(true);

      // Verify that the notification service was called with the resolved recipients
      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        'test-user-id',
        'custom',
        expect.objectContaining({
          recipients: ['dynamic@example.com'],
        }),
      );
    });

    it('should handle dynamic message content from previous blocks', async () => {
      // Create a mock execution context with dynamic message content
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          type: 'custom',
          title: 'Order {{prevNode.orderId}} Update',
          message:
            'Your order #{{prevNode.orderId}} has been {{prevNode.status}}.',
          channel: 'email',
          recipients: ['user@example.com'],
        },
        inputs: {
          prevNode: {
            orderId: '12345',
            status: 'shipped',
          },
        },
      };

      // Execute the block
      const result = await notificationBlockHandler.execute(context, {} as any);

      // Verify that the notification was sent successfully
      expect(result.success).toBe(true);

      // Verify that the notification service was called with the resolved content
      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        'test-user-id',
        'custom',
        expect.objectContaining({
          title: 'Order 12345 Update',
          message: 'Your order #12345 has been shipped.',
        }),
      );
    });
  });

  describe('validate', () => {
    it('should validate valid notification data', () => {
      // Create valid notification data
      const data = {
        type: 'custom',
        title: 'Test Notification',
        message: 'This is a test notification',
        channel: 'email',
        recipients: ['user@example.com'],
      };

      // Validate the data
      const result = (notificationBlockHandler as any).validate(data);

      // Verify that the validation passed
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should invalidate missing notification type', () => {
      // Create data with missing type
      const data = {
        title: 'Test Notification',
        message: 'This is a test notification',
        channel: 'email',
        recipients: ['user@example.com'],
      };

      // Validate the data
      const result = (notificationBlockHandler as any).validate(data);

      // Verify that the validation failed
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Notification type is required');
    });

    it('should invalidate missing notification title', () => {
      // Create data with missing title
      const data = {
        type: 'custom',
        message: 'This is a test notification',
        channel: 'email',
        recipients: ['user@example.com'],
      };

      // Validate the data
      const result = (notificationBlockHandler as any).validate(data);

      // Verify that the validation failed
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Notification title is required');
    });

    it('should invalidate missing notification message', () => {
      // Create data with missing message
      const data = {
        type: 'custom',
        title: 'Test Notification',
        channel: 'email',
        recipients: ['user@example.com'],
      };

      // Validate the data
      const result = (notificationBlockHandler as any).validate(data);

      // Verify that the validation failed
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Notification message is required');
    });

    it('should invalidate missing notification channel', () => {
      // Create data with missing channel
      const data = {
        type: 'custom',
        title: 'Test Notification',
        message: 'This is a test notification',
        recipients: ['user@example.com'],
      };

      // Validate the data
      const result = (notificationBlockHandler as any).validate(data);

      // Verify that the validation failed
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Notification channel is required');
    });

    it('should invalidate invalid notification channel', () => {
      // Create data with an invalid channel
      const data = {
        type: 'custom',
        title: 'Test Notification',
        message: 'This is a test notification',
        channel: 'invalid-channel',
        recipients: ['user@example.com'],
      };

      // Validate the data
      const result = (notificationBlockHandler as any).validate(data);

      // Verify that the validation failed
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid notification channel');
    });

    it('should invalidate missing recipients', () => {
      // Create data with missing recipients
      const data = {
        type: 'custom',
        title: 'Test Notification',
        message: 'This is a test notification',
        channel: 'email',
        recipients: [],
      };

      // Validate the data
      const result = (notificationBlockHandler as any).validate(data);

      // Verify that the validation failed
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one recipient is required');
    });

    it('should invalidate multiple errors', () => {
      // Create data with multiple issues
      const data = {
        type: '',
        title: '',
        message: '',
        channel: '',
        recipients: [],
      };

      // Validate the data
      const result = (notificationBlockHandler as any).validate(data);

      // Verify that the validation failed with multiple errors
      expect(result.valid).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(1);
    });
  });
});
