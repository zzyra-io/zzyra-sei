import { jest } from '@jest/globals';
import { TestBlockExecutionContext } from '../../utils/test-types';
import { Test } from '@nestjs/testing';
import { DatabaseBlockHandler } from '../../../src/workers/handlers/DatabaseBlockHandler';

import { Logger } from '@nestjs/common';
import { createMockSupabaseClient } from '../../utils/mocks';
import * as serviceClient from '../../../src/lib/supabase/serviceClient';
import { BlockHandler } from '@zyra/types';


// Mock the createServiceClient function
jest.mock('../../../src/lib/supabase/serviceClient', () => ({
  createServiceClient: jest.fn(),
}));

describe('DatabaseBlockHandler', () => {
  let databaseBlockHandler: DatabaseBlockHandler;
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
    (serviceClient.createServiceClient as jest.Mock).mockReturnValue(mockSupabase.client);
    
    // Create the testing module
    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: DatabaseBlockHandler,
          useFactory: () => new DatabaseBlockHandler(),
        },
      ],
    }).compile();
    
    // Get the service instance
    databaseBlockHandler = moduleRef.get<DatabaseBlockHandler>(DatabaseBlockHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should execute a SELECT query successfully', async () => {
      // Mock Supabase response for a SELECT query
      mockSupabase.setResponse({ 
        data: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ], 
        error: null 
      });
      
      // Create a mock execution context
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          query: 'SELECT * FROM items WHERE user_id = :userId',
          parameters: {
            userId: 'test-user-id',
          },
        },
        inputs: {},
      };
      
      // Execute the block
      const result = await databaseBlockHandler.execute(context, {} as any);
      
      // Verify that the query was executed successfully
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        rows: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
        rowCount: 2,
      });
      
      // Verify that Supabase was called with the correct parameters
      expect(mockSupabase.client.rpc).toHaveBeenCalledWith(
        'execute_query',
        {
          query_text: 'SELECT * FROM items WHERE user_id = :userId',
          query_params: { userId: 'test-user-id' },
        }
      );
    });
    
    it('should execute an INSERT query successfully', async () => {
      // Mock Supabase response for an INSERT query
      mockSupabase.setResponse({ 
        data: { rowCount: 1 }, 
        error: null 
      });
      
      // Create a mock execution context
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          query: 'INSERT INTO items (name, user_id) VALUES (:name, :userId)',
          parameters: {
            name: 'New Item',
            userId: 'test-user-id',
          },
        },
        inputs: {},
      };
      
      // Execute the block
      const result = await databaseBlockHandler.execute(context, {} as any);
      
      // Verify that the query was executed successfully
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        rowCount: 1,
      });
      
      // Verify that Supabase was called with the correct parameters
      expect(mockSupabase.client.rpc).toHaveBeenCalledWith(
        'execute_query',
        {
          query_text: 'INSERT INTO items (name, user_id) VALUES (:name, :userId)',
          query_params: { name: 'New Item', userId: 'test-user-id' },
        }
      );
    });
    
    it('should handle query execution errors', async () => {
      // Mock Supabase to return an error
      mockSupabase.setResponse({ 
        data: null, 
        error: { message: 'Database error' } 
      });
      
      // Create a mock execution context
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          query: 'SELECT * FROM non_existent_table',
          parameters: {},
        },
        inputs: {},
      };
      
      // Execute the block and expect it to throw
      await expect(databaseBlockHandler.execute(context, {} as any)).rejects.toThrow('Database error');
    });
    
    it('should handle missing query', async () => {
      // Create a mock execution context with missing query
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          query: '',
          parameters: {},
        },
        inputs: {},
      };
      
      // Execute the block and expect it to throw
      await expect(databaseBlockHandler.execute(context, {} as any)).rejects.toThrow('Query is required');
    });
    
    it('should handle dangerous queries', async () => {
      // Create a mock execution context with a dangerous query
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          query: 'DROP TABLE users',
          parameters: {},
        },
        inputs: {},
      };
      
      // Execute the block and expect it to throw
      await expect(databaseBlockHandler.execute(context, {} as any)).rejects.toThrow('Dangerous query detected');
    });
    
    it('should handle queries with input parameters from previous blocks', async () => {
      // Mock Supabase response
      mockSupabase.setResponse({ 
        data: [{ id: 1, name: 'Item 1' }], 
        error: null 
      });
      
      // Create a mock execution context with inputs from previous blocks
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        blockData: {
          query: 'SELECT * FROM items WHERE id = :itemId',
          parameters: {
            itemId: '{{prevNode.itemId}}',
          },
        },
        inputs: {
          prevNode: {
            itemId: 1,
          },
        },
      };
      
      // Execute the block
      const result = await databaseBlockHandler.execute(context, {} as any);
      
      // Verify that the query was executed successfully
      expect(result.success).toBe(true);
      
      // Verify that Supabase was called with the resolved parameters
      expect(mockSupabase.client.rpc).toHaveBeenCalledWith(
        'execute_query',
        {
          query_text: 'SELECT * FROM items WHERE id = :itemId',
          query_params: { itemId: 1 },
        }
      );
    });
  });

  describe('validate', () => {
    it('should validate valid query data', () => {
      // Create valid query data
      const data = {
        query: 'SELECT * FROM items WHERE user_id = :userId',
        parameters: {
          userId: 'test-user-id',
        },
      };
      
      // Validate the data
      const result = (databaseBlockHandler as any).validate(data);
      
      // Verify that the validation passed
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });
    
    it('should invalidate missing query', () => {
      // Create data with missing query
      const data = {
        query: '',
        parameters: {},
      };
      
      // Validate the data
      const result = (databaseBlockHandler as any).validate(data);
      
      // Verify that the validation failed
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Query is required');
    });
    
    it('should invalidate dangerous queries', () => {
      // Create data with a dangerous query
      const data = {
        query: 'DROP TABLE users',
        parameters: {},
      };
      
      // Validate the data
      const result = (databaseBlockHandler as any).validate(data);
      
      // Verify that the validation failed
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Dangerous query detected');
    });
    
    it('should invalidate multiple dangerous queries', () => {
      // Create data with multiple dangerous queries
      const data = {
        query: 'DELETE FROM users; DROP TABLE items;',
        parameters: {},
      };
      
      // Validate the data
      const result = (databaseBlockHandler as any).validate(data);
      
      // Verify that the validation failed
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Dangerous query detected');
    });
    
    it('should validate safe queries', () => {
      // Create data with safe queries
      const safeQueries = [
        'SELECT * FROM items',
        'INSERT INTO items (name) VALUES (:name)',
        'UPDATE items SET name = :name WHERE id = :id',
        'DELETE FROM items WHERE id = :id',
      ];
      
      // Validate each query
      safeQueries.forEach(query => {
        const data = { query, parameters: {} };
        const result = (databaseBlockHandler as any).validate(data);
        expect(result.valid).toBe(true);
      });
    });
  });
});
