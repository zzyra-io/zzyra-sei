import { jest } from '@jest/globals';
import { TestBlockExecutionContext } from '../../utils/test-types';
import { Test } from '@nestjs/testing';
import { WebhookBlockHandler } from '../../../src/workers/handlers/WebhookBlockHandler';

import { Logger } from '@nestjs/common';
import { BlockHandler } from '@zyra/types';


// Mock axios
jest.mock('axios', () => ({
  request: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
}));

describe('WebhookBlockHandler', () => {
  let webhookBlockHandler: WebhookBlockHandler;
  let mockLogger: jest.Mocked<Logger>;
  let mockAxios: any;

  beforeEach(async () => {
    // Create mocks
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<Logger>;
    
    mockAxios = require('axios');
    
    // Create the testing module
    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: WebhookBlockHandler,
          useFactory: () => new WebhookBlockHandler(),
        },
      ],
    }).compile();
    
    // Get the service instance
    webhookBlockHandler = moduleRef.get<WebhookBlockHandler>(WebhookBlockHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should execute a GET request successfully', async () => {
      // Mock axios response
      mockAxios.request.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        data: { message: 'Success' },
        headers: { 'content-type': 'application/json' },
      });
      
      // Create a mock execution context
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          url: 'https://api.example.com/data',
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
          params: {
            limit: 10,
            offset: 0,
          },
        },
        inputs: {},
      };
      
      // Execute the block
      const result = await webhookBlockHandler.execute(context, {} as any);
      
      // Verify that the request was executed successfully
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        status: 200,
        statusText: 'OK',
        data: { message: 'Success' },
        headers: { 'content-type': 'application/json' },
      });
      
      // Verify that axios was called with the correct parameters
      expect(mockAxios.request).toHaveBeenCalledWith({
        url: 'https://api.example.com/data',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        params: {
          limit: 10,
          offset: 0,
        },
        data: undefined,
        timeout: 30000,
      });
    });
    
    it('should execute a POST request with data successfully', async () => {
      // Mock axios response
      mockAxios.request.mockResolvedValueOnce({
        status: 201,
        statusText: 'Created',
        data: { id: 123, message: 'Resource created' },
        headers: { 'content-type': 'application/json' },
      });
      
      // Create a mock execution context
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          url: 'https://api.example.com/resources',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
          data: {
            name: 'Test Resource',
            description: 'This is a test resource',
          },
        },
        inputs: {},
      };
      
      // Execute the block
      const result = await webhookBlockHandler.execute(context, {} as any);
      
      // Verify that the request was executed successfully
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        status: 201,
        statusText: 'Created',
        data: { id: 123, message: 'Resource created' },
        headers: { 'content-type': 'application/json' },
      });
      
      // Verify that axios was called with the correct parameters
      expect(mockAxios.request).toHaveBeenCalledWith({
        url: 'https://api.example.com/resources',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        params: undefined,
        data: {
          name: 'Test Resource',
          description: 'This is a test resource',
        },
        timeout: 30000,
      });
    });
    
    it('should handle request failures', async () => {
      // Mock axios to throw an error
      mockAxios.request.mockRejectedValueOnce({
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { error: 'Resource not found' },
        },
      });
      
      // Create a mock execution context
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          url: 'https://api.example.com/non-existent',
          method: 'GET',
        },
        inputs: {},
      };
      
      // Execute the block
      const result = await webhookBlockHandler.execute(context, {} as any);
      
      // Verify that the request failed but was handled gracefully
      expect(result.success).toBe(false);
      expect(result.error).toEqual('Resource not found');
      expect(result.data).toEqual({
        status: 404,
        statusText: 'Not Found',
        data: { error: 'Resource not found' },
      });
    });
    
    it('should handle network errors', async () => {
      // Mock axios to throw a network error
      mockAxios.request.mockRejectedValueOnce(new Error('Network Error'));
      
      // Create a mock execution context
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          url: 'https://api.example.com/data',
          method: 'GET',
        },
        inputs: {},
      };
      
      // Execute the block
      const result = await webhookBlockHandler.execute(context, {} as any);
      
      // Verify that the network error was handled gracefully
      expect(result.success).toBe(false);
      expect(result.error).toEqual('Network Error');
    });
    
    it('should handle missing URL', async () => {
      // Create a mock execution context with missing URL
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          url: '',
          method: 'GET',
        },
        inputs: {},
      };
      
      // Execute the block and expect it to throw
      await expect(webhookBlockHandler.execute(context, {} as any)).rejects.toThrow('URL is required');
    });
    
    it('should handle missing method', async () => {
      // Create a mock execution context with missing method
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          url: 'https://api.example.com/data',
          method: '',
        },
        inputs: {},
      };
      
      // Execute the block and expect it to throw
      await expect(webhookBlockHandler.execute(context, {} as any)).rejects.toThrow('Method is required');
    });
    
    it('should handle invalid URL', async () => {
      // Create a mock execution context with an invalid URL
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          url: 'not-a-valid-url',
          method: 'GET',
        },
        inputs: {},
      };
      
      // Execute the block and expect it to throw
      await expect(webhookBlockHandler.execute(context, {} as any)).rejects.toThrow('Invalid URL');
    });
    
    it('should handle invalid method', async () => {
      // Create a mock execution context with an invalid method
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          url: 'https://api.example.com/data',
          method: 'INVALID',
        },
        inputs: {},
      };
      
      // Execute the block and expect it to throw
      await expect(webhookBlockHandler.execute(context, {} as any)).rejects.toThrow('Invalid method');
    });
    
    it('should handle dynamic URL from previous blocks', async () => {
      // Mock axios response
      mockAxios.request.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        data: { message: 'Success' },
        headers: { 'content-type': 'application/json' },
      });
      
      // Create a mock execution context with dynamic URL
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          url: '{{prevNode.apiUrl}}',
          method: 'GET',
        },
        inputs: {
          prevNode: {
            apiUrl: 'https://api.example.com/dynamic',
          },
        },
      };
      
      // Execute the block
      const result = await webhookBlockHandler.execute(context, {} as any);
      
      // Verify that the request was executed successfully
      expect(result.success).toBe(true);
      
      // Verify that axios was called with the resolved URL
      expect(mockAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.example.com/dynamic',
        })
      );
    });
    
    it('should handle dynamic data from previous blocks', async () => {
      // Mock axios response
      mockAxios.request.mockResolvedValueOnce({
        status: 201,
        statusText: 'Created',
        data: { id: 123, message: 'Resource created' },
        headers: { 'content-type': 'application/json' },
      });
      
      // Create a mock execution context with dynamic data
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          url: 'https://api.example.com/resources',
          method: 'POST',
          data: {
            name: '{{prevNode.resourceName}}',
            description: '{{prevNode.resourceDescription}}',
          },
        },
        inputs: {
          prevNode: {
            resourceName: 'Dynamic Resource',
            resourceDescription: 'This is a dynamic resource',
          },
        },
      };
      
      // Execute the block
      const result = await webhookBlockHandler.execute(context, {} as any);
      
      // Verify that the request was executed successfully
      expect(result.success).toBe(true);
      
      // Verify that axios was called with the resolved data
      expect(mockAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            name: 'Dynamic Resource',
            description: 'This is a dynamic resource',
          },
        })
      );
    });
    
    it('should handle custom timeout', async () => {
      // Mock axios response
      mockAxios.request.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        data: { message: 'Success' },
        headers: { 'content-type': 'application/json' },
      });
      
      // Create a mock execution context with custom timeout
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          url: 'https://api.example.com/data',
          method: 'GET',
          config: {
            timeout: 5000,
          },
        },
        inputs: {},
      };
      
      // Execute the block
      const result = await webhookBlockHandler.execute(context, {} as any);
      
      // Verify that the request was executed successfully
      expect(result.success).toBe(true);
      
      // Verify that axios was called with the custom timeout
      expect(mockAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 5000,
        })
      );
    });
  });

  describe('validate', () => {
    it('should validate valid webhook data', () => {
      // Create valid webhook data
      const data = {
        url: 'https://api.example.com/data',
        method: 'GET',
      };
      
      // Validate the data
      const result = (webhookBlockHandler as any).validate(data);
      
      // Verify that the validation passed
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });
    
    it('should invalidate missing URL', () => {
      // Create data with missing URL
      const data = {
        url: '',
        method: 'GET',
      };
      
      // Validate the data
      const result = (webhookBlockHandler as any).validate(data);
      
      // Verify that the validation failed
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('URL is required');
    });
    
    it('should invalidate missing method', () => {
      // Create data with missing method
      const data = {
        url: 'https://api.example.com/data',
        method: '',
      };
      
      // Validate the data
      const result = (webhookBlockHandler as any).validate(data);
      
      // Verify that the validation failed
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Method is required');
    });
    
    it('should invalidate invalid URL', () => {
      // Create data with an invalid URL
      const data = {
        url: 'not-a-valid-url',
        method: 'GET',
      };
      
      // Validate the data
      const result = (webhookBlockHandler as any).validate(data);
      
      // Verify that the validation failed
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid URL');
    });
    
    it('should invalidate invalid method', () => {
      // Create data with an invalid method
      const data = {
        url: 'https://api.example.com/data',
        method: 'INVALID',
      };
      
      // Validate the data
      const result = (webhookBlockHandler as any).validate(data);
      
      // Verify that the validation failed
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid method');
    });
    
    it('should validate all valid HTTP methods', () => {
      // Create data with all valid methods
      const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
      
      // Validate each method
      validMethods.forEach(method => {
        const data = {
          url: 'https://api.example.com/data',
          method,
        };
        const result = (webhookBlockHandler as any).validate(data);
        expect(result.valid).toBe(true);
      });
    });
  });
});
