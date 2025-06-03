import { jest } from '@jest/globals';
import { TestBlockExecutionContext } from '../../utils/test-types';
import { Test } from '@nestjs/testing';
import { DatabaseBlockHandler } from '../../../src/workers/handlers/DatabaseBlockHandler';
import { DatabaseService } from '../../../src/services/database.service';
import { Logger } from '@nestjs/common';

// Mock the DatabaseService with proper typing
const mockDatabaseService = {
  prisma: {
    $queryRawUnsafe: jest.fn(),
    $executeRawUnsafe: jest.fn(),
  },
};

describe('DatabaseBlockHandler', () => {
  let databaseBlockHandler: DatabaseBlockHandler;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(async () => {
    // Create mocks
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    // Create the testing module
    const moduleRef = await Test.createTestingModule({
      providers: [
        DatabaseBlockHandler,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    // Get the service instance
    databaseBlockHandler =
      moduleRef.get<DatabaseBlockHandler>(DatabaseBlockHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should execute a SELECT query successfully', async () => {
      // Mock Prisma response for a SELECT query
      const mockResult = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];
      (
        mockDatabaseService.prisma.$queryRawUnsafe as jest.Mock
      ).mockResolvedValueOnce(mockResult);

      // Create a mock execution context
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        workflowId: 'test-workflow-id',
        inputs: {},
        config: {},
        logger: mockLogger as any,
        blockData: {},
      };

      // Create node data
      const node = {
        data: {
          config: {
            table: 'items',
            operation: 'select',
            query: '*',
          },
        },
      };

      // Execute the block
      const result = await databaseBlockHandler.execute(node, context);

      // Verify that the query was executed successfully
      expect(result).toEqual(mockResult);

      // Verify that Prisma was called with the correct parameters
      expect(mockDatabaseService.prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        'SELECT * FROM items',
      );
    });

    it('should execute an INSERT query successfully', async () => {
      // Mock Prisma response for an INSERT query
      (
        mockDatabaseService.prisma.$executeRawUnsafe as jest.Mock
      ).mockResolvedValueOnce(1);

      // Create a mock execution context
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        workflowId: 'test-workflow-id',
        inputs: {},
        config: {},
        logger: mockLogger as any,
        blockData: {},
      };

      // Create node data
      const node = {
        data: {
          config: {
            table: 'items',
            operation: 'insert',
            values: {
              name: 'New Item',
              userId: 'test-user-id',
            },
          },
        },
      };

      // Execute the block
      const result = await databaseBlockHandler.execute(node, context);

      // Verify that the query was executed successfully
      expect(result).toEqual({ insertedCount: 1 });

      // Verify that Prisma was called with the correct parameters
      expect(mockDatabaseService.prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        'INSERT INTO items (name, userId) VALUES (?, ?)',
        'New Item',
        'test-user-id',
      );
    });

    it('should handle query execution errors', async () => {
      // Mock Prisma to throw an error
      (
        mockDatabaseService.prisma.$queryRawUnsafe as jest.Mock
      ).mockRejectedValueOnce(new Error('Database connection failed'));

      // Create a mock execution context
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        workflowId: 'test-workflow-id',
        inputs: {},
        config: {},
        logger: mockLogger as any,
        blockData: {},
      };

      // Create node data
      const node = {
        data: {
          config: {
            table: 'non_existent_table',
            operation: 'select',
          },
        },
      };

      // Execute the block and expect it to throw
      await expect(databaseBlockHandler.execute(node, context)).rejects.toThrow(
        'DATABASE block select error: Database connection failed',
      );
    });

    it('should handle missing query configuration', async () => {
      // Create a mock execution context
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        workflowId: 'test-workflow-id',
        inputs: {},
        config: {},
        logger: mockLogger as any,
        blockData: {},
      };

      // Create node data with missing configuration
      const node = {
        data: {
          config: {
            table: '',
            operation: '',
          },
        },
      };

      // Execute the block and expect it to throw
      await expect(databaseBlockHandler.execute(node, context)).rejects.toThrow(
        'Database block missing table or operation',
      );
    });

    it('should handle unsupported operations', async () => {
      // Create a mock execution context
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        workflowId: 'test-workflow-id',
        inputs: {},
        config: {},
        logger: mockLogger as any,
        blockData: {},
      };

      // Create node data with unsupported operation
      const node = {
        data: {
          config: {
            table: 'items',
            operation: 'delete',
          },
        },
      };

      // Execute the block and expect it to throw
      await expect(databaseBlockHandler.execute(node, context)).rejects.toThrow(
        'Unsupported database operation: delete',
      );
    });

    it('should handle insert without values', async () => {
      // Create a mock execution context
      const context: TestBlockExecutionContext = {
        nodeId: 'test-node-id',
        executionId: 'test-execution-id',
        userId: 'test-user-id',
        workflowId: 'test-workflow-id',
        inputs: {},
        config: {},
        logger: mockLogger as any,
        blockData: {},
      };

      // Create node data with insert but no values
      const node = {
        data: {
          config: {
            table: 'items',
            operation: 'insert',
          },
        },
      };

      // Execute the block and expect it to throw
      await expect(databaseBlockHandler.execute(node, context)).rejects.toThrow(
        'Insert operation requires values',
      );
    });
  });
});
