import { jest } from '@jest/globals';
import { TestBlockExecutionContext } from '../../utils/test-types';
import { Test } from '@nestjs/testing';
import { EmailBlockHandler } from '../../../src/workers/handlers/EmailBlockHandler';

import { Logger } from '@nestjs/common';
import { createMockSupabaseClient } from '../../utils/mocks';
import * as serviceClient from '../../../src/lib/supabase/serviceClient';
import { BlockHandler } from '@zzyra/types';

// Mock the createServiceClient function
jest.mock('../../../src/lib/supabase/serviceClient', () => ({
  createServiceClient: jest.fn(),
}));

// Mock the nodemailer module
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockImplementation((mailOptions) => {
      return Promise.resolve({
        messageId: 'test-message-id',
        envelope: { from: mailOptions.from, to: mailOptions.to },
      });
    }),
    verify: jest.fn().mockResolvedValue(true),
  }),
}));

describe('EmailBlockHandler', () => {
  let emailBlockHandler: EmailBlockHandler;
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
          provide: EmailBlockHandler,
          useFactory: () => new EmailBlockHandler(mockLogger),
        },
      ],
    }).compile();

    // Get the service instance
    emailBlockHandler = moduleRef.get<EmailBlockHandler>(EmailBlockHandler);
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

  describe('execute', () => {
    it('should send an email successfully', async () => {
      // Create a mock execution context
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          to: 'recipient@example.com',
          subject: 'Test Subject',
          body: 'Test Body',
          config: {
            template: null,
            attachments: [],
          },
        },
        inputs: {},
      };

      // Execute the block
      const result = await emailBlockHandler.execute(context, {} as any);

      // Verify that the email was sent successfully
      expect(result.success).toBe(true);
      expect(result.data).toEqual(
        expect.objectContaining({
          messageId: 'test-message-id',
        }),
      );

      // Verify that nodemailer was called with the correct parameters
      const nodemailer = require('nodemailer');
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'test-password',
        },
      });

      const transport = nodemailer.createTransport();
      expect(transport.sendMail).toHaveBeenCalledWith({
        from: 'noreply@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: 'Test Body',
        attachments: [],
      });
    });

    it('should handle email sending failures', async () => {
      // Mock nodemailer to throw an error
      const nodemailer = require('nodemailer');
      nodemailer
        .createTransport()
        .sendMail.mockRejectedValueOnce(new Error('Failed to send email'));

      // Create a mock execution context
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          to: 'recipient@example.com',
          subject: 'Test Subject',
          body: 'Test Body',
          config: {
            template: null,
            attachments: [],
          },
        },
        inputs: {},
      };

      // Execute the block and expect it to throw
      await expect(
        emailBlockHandler.execute(context, {} as any),
      ).rejects.toThrow('Failed to send email');
    });

    it('should handle missing email configuration', async () => {
      // Clear environment variables
      delete process.env.EMAIL_HOST;
      delete process.env.EMAIL_PORT;
      delete process.env.EMAIL_USER;
      delete process.env.EMAIL_PASS;
      delete process.env.EMAIL_FROM;

      // Create a mock execution context
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          to: 'recipient@example.com',
          subject: 'Test Subject',
          body: 'Test Body',
          config: {
            template: null,
            attachments: [],
          },
        },
        inputs: {},
      };

      // Execute the block and expect it to throw
      await expect(
        emailBlockHandler.execute(context, {} as any),
      ).rejects.toThrow('Email configuration is missing');
    });

    it('should handle missing recipient', async () => {
      // Create a mock execution context with missing recipient
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          to: '',
          subject: 'Test Subject',
          body: 'Test Body',
          config: {
            template: null,
            attachments: [],
          },
        },
        inputs: {},
      };

      // Execute the block and expect it to throw
      await expect(
        emailBlockHandler.execute(context, {} as any),
      ).rejects.toThrow('Recipient email is required');
    });

    it('should handle missing subject', async () => {
      // Create a mock execution context with missing subject
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          to: 'recipient@example.com',
          subject: '',
          body: 'Test Body',
          config: {
            template: null,
            attachments: [],
          },
        },
        inputs: {},
      };

      // Execute the block and expect it to throw
      await expect(
        emailBlockHandler.execute(context, {} as any),
      ).rejects.toThrow('Email subject is required');
    });

    it('should handle missing body', async () => {
      // Create a mock execution context with missing body
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          to: 'recipient@example.com',
          subject: 'Test Subject',
          body: '',
          config: {
            template: null,
            attachments: [],
          },
        },
        inputs: {},
      };

      // Execute the block and expect it to throw
      await expect(
        emailBlockHandler.execute(context, {} as any),
      ).rejects.toThrow('Email body is required');
    });

    it('should use a template if provided', async () => {
      // Mock Supabase to return a template
      mockSupabase.setResponse({
        data: {
          id: 'template1',
          name: 'Test Template',
          content: 'Hello {{name}}, this is a test template.',
          subject: 'Template Subject',
        },
        error: null,
      });

      // Create a mock execution context with a template
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          to: 'recipient@example.com',
          subject: '',
          body: '',
          config: {
            template: 'template1',
            attachments: [],
            templateVariables: { name: 'John' },
          },
        },
        inputs: {},
      };

      // Execute the block
      const result = await emailBlockHandler.execute(context, {} as any);

      // Verify that the email was sent successfully
      expect(result.success).toBe(true);

      // Verify that Supabase was queried for the template
      expect(mockSupabase.client.from).toHaveBeenCalledWith('email_templates');
      expect(mockSupabase.mocks.select).toHaveBeenCalled();
      expect(mockSupabase.mocks.eq).toHaveBeenCalledWith('id', 'template1');

      // Verify that nodemailer was called with the template content
      const nodemailer = require('nodemailer');
      const transport = nodemailer.createTransport();
      expect(transport.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Template Subject',
          html: 'Hello John, this is a test template.',
        }),
      );
    });

    it('should handle template not found', async () => {
      // Mock Supabase to return no template
      mockSupabase.setResponse({ data: null, error: null });

      // Create a mock execution context with a non-existent template
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          to: 'recipient@example.com',
          subject: '',
          body: '',
          config: {
            template: 'non-existent-template',
            attachments: [],
          },
        },
        inputs: {},
      };

      // Execute the block and expect it to throw
      await expect(
        emailBlockHandler.execute(context, {} as any),
      ).rejects.toThrow('Email template not found');
    });

    it('should handle template variables', async () => {
      // Mock Supabase to return a template with multiple variables
      mockSupabase.setResponse({
        data: {
          id: 'template1',
          name: 'Test Template',
          content:
            'Hello {{name}}, your order #{{orderId}} has been {{status}}.',
          subject: 'Order {{status}} - #{{orderId}}',
        },
        error: null,
      });

      // Create a mock execution context with a template and variables
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          to: 'recipient@example.com',
          subject: '',
          body: '',
          config: {
            template: 'template1',
            attachments: [],
            templateVariables: {
              name: 'John',
              orderId: '12345',
              status: 'shipped',
            },
          },
        },
        inputs: {},
      };

      // Execute the block
      const result = await emailBlockHandler.execute(context, {} as any);

      // Verify that the email was sent successfully
      expect(result.success).toBe(true);

      // Verify that nodemailer was called with the processed template
      const nodemailer = require('nodemailer');
      const transport = nodemailer.createTransport();
      expect(transport.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Order shipped - #12345',
          html: 'Hello John, your order #12345 has been shipped.',
        }),
      );
    });
  });

  describe('validate', () => {
    it('should validate valid email data', () => {
      // Create valid email data
      const data = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test Body',
      };

      // Validate the data
      const result = (emailBlockHandler as any).validate(data, {} as any);

      // Verify that the validation passed
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should invalidate missing recipient', () => {
      // Create email data with missing recipient
      const data = {
        to: '',
        subject: 'Test Subject',
        body: 'Test Body',
      };

      // Validate the data
      const result = (emailBlockHandler as any).validate(data, {} as any);

      // Verify that the validation failed
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Recipient email is required');
    });

    it('should invalidate missing subject', () => {
      // Create email data with missing subject
      const data = {
        to: 'recipient@example.com',
        subject: '',
        body: 'Test Body',
      };

      // Validate the data
      const result = (emailBlockHandler as any).validate(data, {} as any);

      // Verify that the validation failed
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Email subject is required');
    });

    it('should invalidate missing body', () => {
      // Create email data with missing body
      const data = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: '',
      };

      // Validate the data
      const result = (emailBlockHandler as any).validate(data, {} as any);

      // Verify that the validation failed
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Email body is required');
    });

    it('should invalidate invalid email address', () => {
      // Create email data with an invalid email address
      const data = {
        to: 'not-an-email',
        subject: 'Test Subject',
        body: 'Test Body',
      };

      // Validate the data
      const result = (emailBlockHandler as any).validate(data, {} as any);

      // Verify that the validation failed
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid email address');
    });

    it('should validate multiple errors', () => {
      // Create email data with multiple issues
      const data = {
        to: '',
        subject: '',
        body: '',
      };

      // Validate the data
      const result = (emailBlockHandler as any).validate(data, {} as any);

      // Verify that the validation failed with multiple errors
      expect(result.valid).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Recipient email is required');
      expect(result.errors).toContain('Email subject is required');
      expect(result.errors).toContain('Email body is required');
    });
  });
});
