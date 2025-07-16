import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../services/database.service';
import { MagicAdminService } from '../../services/magic-admin.service';

import { BlockExecutionContext, BlockHandler, BlockType } from '@zyra/types';
import * as vm from 'vm';
import { EmailBlockHandler } from './EmailBlockHandler';
import { HttpRequestHandler } from './HttpRequestHandler';
import { MetricsBlockHandler } from './MetricsBlockHandler';
import { ScheduleBlockHandler } from './ScheduleBlockHandler';
import { CustomBlockHandler } from './CustomBlockHandler';

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

    this.handlers = {
      // Action blocks
      [BlockType.EMAIL]: new MetricsBlockHandler(
        BlockType.EMAIL,
        new EmailBlockHandler(this.databaseService),
      ),

      // Trigger blocks
      [BlockType.PRICE_MONITOR]: new MetricsBlockHandler(
        BlockType.PRICE_MONITOR,
        new HttpRequestHandler(),
      ),

      // Generic blocks
      [BlockType.HTTP_REQUEST]: new MetricsBlockHandler(
        BlockType.HTTP_REQUEST,
        new HttpRequestHandler(),
      ),

      // Custom blocks
      [BlockType.CUSTOM]: new MetricsBlockHandler(
        BlockType.CUSTOM,
        new CustomBlockHandler(this.databaseService),
      ),

      // Legacy block types mapped to new handlers
      [BlockType.CONDITION]: new MetricsBlockHandler(BlockType.CONDITION, {
        execute: (node: any, context: BlockExecutionContext) => {
          return Promise.resolve({
            result: 'condition',
          });
        },
      }),

      // Logic blocks with dedicated handlers
      [BlockType.SCHEDULE]: new MetricsBlockHandler(
        BlockType.SCHEDULE,
        new ScheduleBlockHandler(),
      ),

      // Additional block types mapped to existing handlers

      [BlockType.WEBHOOK]: new MetricsBlockHandler(
        BlockType.WEBHOOK,
        new HttpRequestHandler(),
      ),

      // Placeholder handlers for unimplemented block types

      [BlockType.UNKNOWN]: new MetricsBlockHandler(BlockType.UNKNOWN, {
        execute: (inputs: any, context: any) => {
          const blockType = context?.blockType || 'unknown';
          throw new Error(
            `Unknown block type: ${blockType}. Available types: ${Object.keys(this.handlers).join(', ')}`,
          );
        },
      }),
    };
  }

  /**
   * Retrieve a handler for the given block type.
   * Performs case-insensitive lookup to match handlers.
   */
  getHandler(type: BlockType | string): BlockHandler {
    // Direct match first
    if (this.handlers[type]) {
      return this.handlers[type];
    }

    // All custom blocks now use the unified CUSTOM type
    if (typeof type === 'string' && type.toUpperCase() === 'CUSTOM') {
      return this.handlers[BlockType.CUSTOM];
    }

    // Try case-insensitive match if the type is a string
    if (typeof type === 'string') {
      const upperType = type.toUpperCase();
      // Check if any handler key matches when converted to uppercase
      const handlerKey = Object.keys(this.handlers).find(
        (key) => key.toUpperCase() === upperType,
      );

      if (handlerKey) {
        return this.handlers[handlerKey];
      }
    }

    // Log the unknown block type for debugging
    this.logger.error(`Unknown block type encountered: ${type}`);
    this.logger.error(
      `Available block types: ${Object.keys(this.handlers).join(', ')}`,
    );

    // Fall back to unknown handler
    return this.handlers[BlockType.UNKNOWN];
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
        ${blockDefinition.code}
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

    switch (blockDefinition.logicType?.toLowerCase()) {
      case 'javascript':
        return this.executeJavaScript(
          blockDefinition,
          validatedInputs,
          nodeId,
          executionId,
        );
      default:
        throw new Error(`Unsupported logic type: ${blockDefinition.logicType}`);
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
