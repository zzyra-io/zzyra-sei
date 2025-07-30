import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import {
  NotificationService,
  NotificationType,
} from '../../src/services/notification.service';
import { Logger } from '@nestjs/common';
import { createMockSupabaseClient } from '../utils/mocks';
import * as serviceClient from '../../src/lib/supabase/serviceClient';

// Mock the createServiceClient function
jest.mock('../../src/lib/supabase/serviceClient', () => ({
  createServiceClient: jest.fn(),
}));

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test-message-id',
      envelope: { from: 'noreply@example.com', to: 'user@example.com' },
    }),
    verify: jest.fn().mockResolvedValue(true),
  }),
}));

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockLogger: jest.Mocked<Logger>;
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

    // Mock the createServiceClient function to return our mock Supabase client
    (serviceClient.createServiceClient as jest.Mock).mockReturnValue(
      mockSupabase.client,
    );

    // Set up environment variables for testing
    process.env.EMAIL_HOST = 'smtp.example.com';
    process.env.EMAIL_PORT = '587';
    process.env.EMAIL_USER = 'test@example.com';
    process.env.EMAIL_PASS = 'test-password';
    process.env.EMAIL_FROM = 'noreply@example.com';

    // Create the testing module
    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: NotificationService,
          useFactory: () => new NotificationService(mockLogger),
        },
      ],
    }).compile();

    // Get the service instance
    notificationService =
      moduleRef.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up environment variables
    delete process.env.EMAIL_HOST;
    delete process.env.EMAIL_PORT;
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    delete process.env.EMAIL_FROM;
  });

  describe('sendNotification', () => {
    it('should send a workflow_completed notification', async () => {
      // Mock Supabase to return user profile
      mockSupabase.setResponse({
        data: [
          {
            id: 'test-user-id',
            email: 'user@example.com',
            notification_preferences: {
              email: true,
              in_app: true,
            },
          },
        ],
        error: null,
      });

      // Mock Supabase to return notification template
      mockSupabase.setResponse({
        data: {
          id: 'workflow_completed',
          subject: 'Workflow {{workflow_name}} Completed',
          email_template:
            'Your workflow {{workflow_name}} (ID: {{workflow_id}}) has completed successfully.',
          in_app_template: 'Workflow {{workflow_name}} completed.',
        },
        error: null,
      });

      // Mock Supabase to return successful notification log insert
      mockSupabase.setResponse({ data: { id: 'notification1' }, error: null });

      // Call sendNotification
      await notificationService.sendNotification(
        'test-user-id',
        'workflow_completed',
        {
          workflow_id: 'test-workflow-id',
          workflow_name: 'Test Workflow',
          execution_id: 'test-execution-id',
          status: 'completed',
          duration_ms: 1000,
        },
      );

      // Verify that Supabase was queried for the user profile
      expect(mockSupabase.client.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.mocks.select).toHaveBeenCalled();
      expect(mockSupabase.mocks.eq).toHaveBeenCalledWith('id', 'test-user-id');

      // Verify that Supabase was queried for the notification template
      expect(mockSupabase.client.from).toHaveBeenCalledWith(
        'notification_templates',
      );
      expect(mockSupabase.mocks.select).toHaveBeenCalled();
      expect(mockSupabase.mocks.eq).toHaveBeenCalledWith(
        'id',
        'workflow_completed',
      );

      // Verify that an email was sent
      const nodemailer = require('nodemailer');
      const transport = nodemailer.createTransport();
      expect(transport.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Workflow Test Workflow Completed',
          html: expect.stringContaining(
            'Your workflow Test Workflow (ID: test-workflow-id) has completed successfully.',
          ),
        }),
      );

      // Verify that a notification log was created
      expect(mockSupabase.client.from).toHaveBeenCalledWith(
        'notification_logs',
      );
      expect(mockSupabase.mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-id',
          type: 'workflow_completed',
          channels: ['email', 'in_app'],
          data: expect.objectContaining({
            workflow_id: 'test-workflow-id',
            workflow_name: 'Test Workflow',
          }),
        }),
      );
    });

    it('should send a workflow_failed notification', async () => {
      // Mock Supabase to return user profile
      mockSupabase.setResponse({
        data: [
          {
            id: 'test-user-id',
            email: 'user@example.com',
            notification_preferences: {
              email: true,
              in_app: true,
            },
          },
        ],
        error: null,
      });

      // Mock Supabase to return notification template
      mockSupabase.setResponse({
        data: {
          id: 'workflow_failed',
          subject: 'Workflow {{workflow_name}} Failed',
          email_template:
            'Your workflow {{workflow_name}} (ID: {{workflow_id}}) has failed: {{error}}',
          in_app_template: 'Workflow {{workflow_name}} failed: {{error}}',
        },
        error: null,
      });

      // Mock Supabase to return successful notification log insert
      mockSupabase.setResponse({ data: { id: 'notification1' }, error: null });

      // Call sendNotification
      await notificationService.sendNotification(
        'test-user-id',
        'workflow_failed',
        {
          workflow_id: 'test-workflow-id',
          workflow_name: 'Test Workflow',
          execution_id: 'test-execution-id',
          status: 'failed',
          error: 'Something went wrong',
          duration_ms: 1000,
        },
      );

      // Verify that an email was sent
      const nodemailer = require('nodemailer');
      const transport = nodemailer.createTransport();
      expect(transport.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Workflow Test Workflow Failed',
          html: expect.stringContaining(
            'Your workflow Test Workflow (ID: test-workflow-id) has failed: Something went wrong',
          ),
        }),
      );

      // Verify that a notification log was created
      expect(mockSupabase.client.from).toHaveBeenCalledWith(
        'notification_logs',
      );
      expect(mockSupabase.mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-id',
          type: 'workflow_failed',
          channels: ['email', 'in_app'],
          data: expect.objectContaining({
            workflow_id: 'test-workflow-id',
            workflow_name: 'Test Workflow',
            error: 'Something went wrong',
          }),
        }),
      );
    });

    it('should send a custom notification', async () => {
      // Mock Supabase to return user profile
      mockSupabase.setResponse({
        data: [
          {
            id: 'test-user-id',
            email: 'user@example.com',
            notification_preferences: {
              email: true,
              in_app: true,
            },
          },
        ],
        error: null,
      });

      // Mock Supabase to return successful notification log insert
      mockSupabase.setResponse({ data: { id: 'notification1' }, error: null });

      // Call sendNotification with a custom notification
      await notificationService.sendNotification('test-user-id', 'custom', {
        title: 'Custom Notification',
        message: 'This is a custom notification',
        recipients: ['user@example.com'],
        channel: 'email',
      });

      // Verify that an email was sent
      const nodemailer = require('nodemailer');
      const transport = nodemailer.createTransport();
      expect(transport.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Custom Notification',
          html: 'This is a custom notification',
        }),
      );

      // Verify that a notification log was created
      expect(mockSupabase.client.from).toHaveBeenCalledWith(
        'notification_logs',
      );
      expect(mockSupabase.mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-id',
          type: 'custom',
          channels: ['email'],
          data: expect.objectContaining({
            title: 'Custom Notification',
            message: 'This is a custom notification',
          }),
        }),
      );
    });

    it('should respect user notification preferences', async () => {
      // Mock Supabase to return user profile with email disabled
      mockSupabase.setResponse({
        data: [
          {
            id: 'test-user-id',
            email: 'user@example.com',
            notification_preferences: {
              email: false,
              in_app: true,
            },
          },
        ],
        error: null,
      });

      // Mock Supabase to return notification template
      mockSupabase.setResponse({
        data: {
          id: 'workflow_completed',
          subject: 'Workflow {{workflow_name}} Completed',
          email_template:
            'Your workflow {{workflow_name}} (ID: {{workflow_id}}) has completed successfully.',
          in_app_template: 'Workflow {{workflow_name}} completed.',
        },
        error: null,
      });

      // Mock Supabase to return successful notification log insert
      mockSupabase.setResponse({ data: { id: 'notification1' }, error: null });

      // Call sendNotification
      await notificationService.sendNotification(
        'test-user-id',
        'workflow_completed',
        {
          workflow_id: 'test-workflow-id',
          workflow_name: 'Test Workflow',
          execution_id: 'test-execution-id',
          status: 'completed',
          duration_ms: 1000,
        },
      );

      // Verify that no email was sent
      const nodemailer = require('nodemailer');
      const transport = nodemailer.createTransport();
      expect(transport.sendMail).not.toHaveBeenCalled();

      // Verify that a notification log was created with only in_app channel
      expect(mockSupabase.client.from).toHaveBeenCalledWith(
        'notification_logs',
      );
      expect(mockSupabase.mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-id',
          type: 'workflow_completed',
          channels: ['in_app'],
        }),
      );
    });

    it('should handle missing user profile', async () => {
      // Mock Supabase to return no user profile
      mockSupabase.setResponse({ data: [], error: null });

      // Call sendNotification and expect it to throw
      await expect(
        notificationService.sendNotification(
          'test-user-id',
          'workflow_completed',
          {
            workflow_id: 'test-workflow-id',
            workflow_name: 'Test Workflow',
          },
        ),
      ).rejects.toThrow('User profile not found');
    });

    it('should handle missing notification template', async () => {
      // Mock Supabase to return user profile
      mockSupabase.setResponse({
        data: [
          {
            id: 'test-user-id',
            email: 'user@example.com',
            notification_preferences: {
              email: true,
              in_app: true,
            },
          },
        ],
        error: null,
      });

      // Mock Supabase to return no notification template
      mockSupabase.setResponse({ data: null, error: null });

      // Call sendNotification and expect it to throw
      await expect(
        notificationService.sendNotification(
          'test-user-id',
          'non_existent_template',
          {
            workflow_id: 'test-workflow-id',
            workflow_name: 'Test Workflow',
          },
        ),
      ).rejects.toThrow('Notification template not found');
    });

    it('should handle email sending failures', async () => {
      // Mock Supabase to return user profile
      mockSupabase.setResponse({
        data: [
          {
            id: 'test-user-id',
            email: 'user@example.com',
            notification_preferences: {
              email: true,
              in_app: true,
            },
          },
        ],
        error: null,
      });

      // Mock Supabase to return notification template
      mockSupabase.setResponse({
        data: {
          id: 'workflow_completed',
          subject: 'Workflow {{workflow_name}} Completed',
          email_template:
            'Your workflow {{workflow_name}} (ID: {{workflow_id}}) has completed successfully.',
          in_app_template: 'Workflow {{workflow_name}} completed.',
        },
        error: null,
      });

      // Mock nodemailer to throw an error
      const nodemailer = require('nodemailer');
      nodemailer
        .createTransport()
        .sendMail.mockRejectedValueOnce(new Error('Failed to send email'));

      // Mock Supabase to return successful notification log insert
      mockSupabase.setResponse({ data: { id: 'notification1' }, error: null });

      // Call sendNotification
      await notificationService.sendNotification(
        'test-user-id',
        'workflow_completed',
        {
          workflow_id: 'test-workflow-id',
          workflow_name: 'Test Workflow',
          execution_id: 'test-execution-id',
          status: 'completed',
          duration_ms: 1000,
        },
      );

      // Verify that a notification log was still created but with only in_app channel
      expect(mockSupabase.client.from).toHaveBeenCalledWith(
        'notification_logs',
      );
      expect(mockSupabase.mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-id',
          type: 'workflow_completed',
          channels: ['in_app'],
          error: expect.stringContaining('Failed to send email'),
        }),
      );

      // Verify that the error was logged
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle template rendering errors', async () => {
      // Mock Supabase to return user profile
      mockSupabase.setResponse({
        data: [
          {
            id: 'test-user-id',
            email: 'user@example.com',
            notification_preferences: {
              email: true,
              in_app: true,
            },
          },
        ],
        error: null,
      });

      // Mock Supabase to return notification template with invalid syntax
      mockSupabase.setResponse({
        data: {
          id: 'workflow_completed',
          subject: 'Workflow {{workflow_name} Completed', // Missing closing brace
          email_template:
            'Your workflow {{workflow_name} has completed successfully.', // Missing closing brace
          in_app_template: 'Workflow {{workflow_name} completed.', // Missing closing brace
        },
        error: null,
      });

      // Mock Supabase to return successful notification log insert
      mockSupabase.setResponse({ data: { id: 'notification1' }, error: null });

      // Call sendNotification
      await notificationService.sendNotification(
        'test-user-id',
        'workflow_completed',
        {
          workflow_id: 'test-workflow-id',
          workflow_name: 'Test Workflow',
          execution_id: 'test-execution-id',
          status: 'completed',
          duration_ms: 1000,
        },
      );

      // Verify that a notification log was created with an error
      expect(mockSupabase.client.from).toHaveBeenCalledWith(
        'notification_logs',
      );
      expect(mockSupabase.mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-id',
          type: 'workflow_completed',
          channels: [],
          error: expect.stringContaining('Error rendering template'),
        }),
      );

      // Verify that the error was logged
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
