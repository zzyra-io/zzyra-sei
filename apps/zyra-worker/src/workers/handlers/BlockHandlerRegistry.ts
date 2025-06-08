import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../services/database.service';

import { BlockHandler, BlockType } from '@zyra/types';
import * as vm from 'vm';
import { CircuitBreaker } from '../../lib/blockchain/CircuitBreaker';
import { CircuitBreakerDbService } from '../../lib/blockchain/CircuitBreakerDbService';
import { WalletService } from './blockchain/WalletService';
import { EmailBlockHandler } from './EmailBlockHandler';
import { MetricsBlockHandler } from './MetricsBlockHandler';
import { NotificationBlockHandler } from './NotificationBlockHandler';
import { PriceMonitorBlockHandler } from './PriceMonitorBlockHandler';
import { ScheduleBlockHandler } from './ScheduleBlockHandler';

/**
 * Central registry for all block handlers.
 */
@Injectable()
export class BlockHandlerRegistry {
  // Using string keys to avoid type issues with BlockType enum
  private handlers: Record<string, BlockHandler>;

  // Maximum execution time for JavaScript blocks in milliseconds
  private readonly MAX_EXECUTION_TIME = 30000; // 30 seconds

  constructor(
    private readonly logger: Logger,
    private readonly databaseService: DatabaseService,
  ) {
    // Initialize services
    const walletService = new WalletService(this.databaseService);

    // Create circuit breaker for blockchain operations
    const circuitBreaker = new CircuitBreaker();
    const circuitBreakerDbService = new CircuitBreakerDbService(
      this.databaseService,
    );

    this.handlers = {
      // Action blocks
      [BlockType.EMAIL]: new MetricsBlockHandler(
        BlockType.EMAIL,
        new EmailBlockHandler(this.databaseService),
      ),
      [BlockType.NOTIFICATION]: new MetricsBlockHandler(
        BlockType.NOTIFICATION,
        new NotificationBlockHandler(this.databaseService, {} as any),
      ),

      // Trigger blocks
      [BlockType.PRICE_MONITOR]: new MetricsBlockHandler(
        BlockType.PRICE_MONITOR,
        new PriceMonitorBlockHandler(),
      ),

      // Logic blocks with dedicated handlers

      [BlockType.DELAY]: new MetricsBlockHandler(
        BlockType.DELAY,
        new ScheduleBlockHandler(),
      ),

      [BlockType.UNKNOWN]: new MetricsBlockHandler(BlockType.UNKNOWN, {
        execute: () => {
          throw new Error('Unknown block type');
        },
      }),
    };
  }

  /**
   * Retrieve a handler for the given block type.
   */
  getHandler(type: BlockType | string): BlockHandler {
    return this.handlers[type] || this.handlers[BlockType.UNKNOWN];
  }

  /**
   * Get the full map of handlers (used for initialization).
   */
  getAllHandlers(): Record<string, BlockHandler> {
    return this.handlers;
  }

  /**
   * Register a handler for a specific block type.
   * @param blockType The type of block to register a handler for
   * @param handler The handler to use for this block type
   */
  registerHandler(blockType: BlockType | string, handler: BlockHandler): void {
    this.handlers[blockType] = handler;
  }

  private async executeJavaScript(
    blockDefinition: any,
    inputs: Record<string, any>,
    nodeId: string,
    executionId: string,
  ): Promise<any> {
    const sandbox = {
      inputs,
      console: {
        log: (...args: any[]) => {
          this.logger.log(`[Block ${blockDefinition.id}] ${args.join(' ')}`);
          this.logToDatabase(executionId, nodeId, 'info', args.join(' '));
        },
        error: (...args: any[]) => {
          this.logger.error(`[Block ${blockDefinition.id}] ${args.join(' ')}`);
          this.logToDatabase(executionId, nodeId, 'error', args.join(' '));
        },
      },
      // Safe utilities
      JSON: { parse: JSON.parse, stringify: JSON.stringify },
      Math,
      Date,
    };

    const context = vm.createContext(sandbox);
    const script = new vm.Script(`
      (async () => {
        ${blockDefinition.logic}
      })();
    `);

    const result = await Promise.race([
      script.runInContext(context, {
        timeout: this.MAX_EXECUTION_TIME,
        displayErrors: true,
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Execution timeout')),
          this.MAX_EXECUTION_TIME,
        ),
      ),
    ]);

    return this.validateOutputs(blockDefinition.outputs, result);
  }

  private validateInputs(
    schema: any[],
    inputs: Record<string, any>,
  ): Record<string, any> {
    const validatedInputs: Record<string, any> = {};

    for (const input of schema) {
      const value = inputs[input.name];

      if (input.required && value === undefined) {
        throw new Error(`Required input '${input.name}' is missing`);
      }

      if (value !== undefined) {
        this.validateDataType(value, input.dataType, input.name, 'input');
        validatedInputs[input.name] = value;
      } else if (input.defaultValue !== undefined) {
        validatedInputs[input.name] = input.defaultValue;
      }
    }

    return validatedInputs;
  }

  private validateOutputs(schema: any[], outputs: any): Record<string, any> {
    const validatedOutputs: Record<string, any> = {};

    for (const output of schema) {
      const value = outputs[output.name];

      if (output.required && value === undefined) {
        throw new Error(`Required output '${output.name}' is missing`);
      }

      if (value !== undefined) {
        this.validateDataType(value, output.dataType, output.name, 'output');
        validatedOutputs[output.name] = value;
      }
    }

    return validatedOutputs;
  }

  private validateDataType(
    value: any,
    type: string,
    name: string,
    context: 'input' | 'output',
  ): void {
    switch (type) {
      case 'number':
        if (typeof value !== 'number')
          throw new Error(`${context} '${name}' must be a number`);
        break;
      case 'string':
        if (typeof value !== 'string')
          throw new Error(`${context} '${name}' must be a string`);
        break;
      case 'boolean':
        if (typeof value !== 'boolean')
          throw new Error(`${context} '${name}' must be a boolean`);
        break;
      case 'object':
        if (typeof value !== 'object')
          throw new Error(`${context} '${name}' must be an object`);
        break;
      case 'array':
        if (!Array.isArray(value))
          throw new Error(`${context} '${name}' must be an array`);
        break;
    }
  }
  private async executeBlockLogic(
    blockDefinition: any,
    inputs: Record<string, any>,
    nodeId: string,
    executionId: string,
  ): Promise<any> {
    const validatedInputs = this.validateInputs(blockDefinition.inputs, inputs);

    switch (blockDefinition.logic_type?.toLowerCase()) {
      case 'javascript':
        return this.executeJavaScript(
          blockDefinition,
          validatedInputs,
          nodeId,
          executionId,
        );
      default:
        throw new Error(
          `Unsupported logic type: ${blockDefinition.logic_type}`,
        );
    }
  }

  /**
   * Helper method to log to database
   */
  private async logToDatabase(
    executionId: string,
    nodeId: string,
    level: 'info' | 'error' | 'warn' | 'debug',
    message: string,
  ): Promise<void> {
    try {
      // Implementation would use a database service to log the message
      this.logger.log(`[${level.toUpperCase()}] [${nodeId}] ${message}`);
    } catch (error) {
      this.logger.error(`Failed to log message to database: ${error}`);
    }
  }
}
