import { jest } from '@jest/globals';
import { TestBlockHandler } from '../../utils/test-types';
import { Test } from '@nestjs/testing';
import { BlockHandlerRegistry } from '../../../src/workers/handlers/BlockHandlerRegistry';

import { Logger } from '@nestjs/common';
import { BlockType, BlockHandler } from '@zzyra/types';

describe('BlockHandlerRegistry', () => {
  let blockHandlerRegistry: BlockHandlerRegistry;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    // Create a mock logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    // Create the BlockHandlerRegistry instance
    blockHandlerRegistry = new BlockHandlerRegistry(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllHandlers', () => {
    it('should return handlers for all block types', () => {
      // Get all handlers
      const handlers = blockHandlerRegistry.getAllHandlers();

      // Verify that handlers exist for all block types
      expect(handlers[BlockType.EMAIL]).toBeDefined();
      expect(handlers[BlockType.AI_BLOCKCHAIN]).toBeDefined();
      expect(handlers[BlockType.DATABASE]).toBeDefined();
      expect(handlers[BlockType.CUSTOM]).toBeDefined();
      expect(handlers[BlockType.WEBHOOK]).toBeDefined();
      expect(handlers[BlockType.EMAIL]).toBeDefined();

      // Verify that each handler has the required methods
      Object.values(handlers).forEach((handler) => {
        expect(handler.execute).toBeDefined();
        expect(typeof handler.execute).toBe('function');
        // Some handlers may not have validate method, so we check it conditionally
        if ((handler as any).validate) {
          expect(typeof (handler as any).validate).toBe('function');
        }
      });
    });

    it('should log initialization of handlers', () => {
      // Get all handlers
      blockHandlerRegistry.getAllHandlers();

      // Verify that initialization was logged
      expect(mockLogger.log).toHaveBeenCalled();
    });
  });

  describe('getHandler', () => {
    it('should return the correct handler for a block type', () => {
      // Get a specific handler
      const emailHandler = blockHandlerRegistry.getHandler(BlockType.EMAIL);

      // Verify that the correct handler was returned
      expect(emailHandler).toBeDefined();
      expect(emailHandler.execute).toBeDefined();
      expect((emailHandler as any).validate).toBeDefined();
    });

    it('should throw an error for an unknown block type', () => {
      // Attempt to get a handler for an unknown block type
      expect(() => {
        blockHandlerRegistry.getHandler('UNKNOWN_TYPE' as BlockType);
      }).toThrow('No handler found for block type: UNKNOWN_TYPE');
    });
  });
});
