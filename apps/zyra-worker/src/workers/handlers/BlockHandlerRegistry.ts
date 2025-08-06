import { Injectable, Logger } from '@nestjs/common';
import { BlockType } from '@zyra/types';
import { DatabaseService } from '../../services/database.service';
import { ExecutionLogger } from '../execution-logger';
import { BlockExecutionContext, BlockHandler } from '@zyra/types';
import { EnhancedBlockRegistry } from './enhanced/EnhancedBlockRegistry';
import { MetricsBlockHandler } from './MetricsBlockHandler';
import { DataTransformHandler } from './DataTransformHandler';
import { EdgeTransformHandler } from './EdgeTransformHandler';
import { CustomBlockHandler } from './CustomBlockHandler';
import { ScheduleBlockHandler } from './ScheduleBlockHandler';
import { HttpRequestHandler } from './HttpRequestHandler';
import { ZyraTemplateProcessor } from '../../utils/template-processor';
import * as vm from 'vm';

// Sei blockchain operations now handled by official @sei-js/mcp-server
import { AIAgentHandler } from './AIAgentHandler';
import { LLMProviderManager } from './ai-agent/LLMProviderManager';
import { MCPServerManager } from './ai-agent/MCPServerManager';
import { SecurityValidator } from './ai-agent/SecurityValidator';
import { ReasoningEngine } from './ai-agent/ReasoningEngine';
import { SubscriptionService } from './ai-agent/SubscriptionService';
import { CacheService } from './ai-agent/CacheService';
import { ToolAnalyticsService } from './ai-agent/ToolAnalyticsService';
import { ConfigService } from '@nestjs/config';

/**
 * Central registry for all block handlers.
 */
@Injectable()
export class BlockHandlerRegistry {
  // Using string keys to avoid type issues with BlockType enum
  private handlers: Record<string, BlockHandler>;
  private enhancedRegistry: EnhancedBlockRegistry;

  // Maximum execution time for JavaScript blocks in milliseconds
  private readonly MAX_EXECUTION_TIME = 30000; // 30 seconds

  constructor(
    private readonly logger: Logger,
    private readonly databaseService: DatabaseService,
    private readonly executionLogger: ExecutionLogger,
    private readonly configService: ConfigService,
  ) {
    // Initialize enhanced block system
    const templateProcessor = new ZyraTemplateProcessor();
    this.enhancedRegistry = new EnhancedBlockRegistry(
      templateProcessor,
      this.databaseService,
      this.executionLogger,
      this.configService,
    );

    this.handlers = {
      // Notifications are handled by the enhanced registry
      // [BlockType.EMAIL]: Handled by enhanced registry

      // Trigger blocks are handled by the enhanced registry
      // [BlockType.PRICE_MONITOR]: Handled by enhanced registry

      // HTTP requests are handled by the enhanced registry
      // [BlockType.HTTP_REQUEST]: Handled by enhanced registry

      // Data transformation blocks
      [BlockType.DATA_TRANSFORM]: new MetricsBlockHandler(
        BlockType.DATA_TRANSFORM,
        new DataTransformHandler(),
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

      // Sei blockchain operations now available through @sei-js/mcp-server via AI_AGENT blocks

      // AI Agent handler with proper dependency injection
      ['AI_AGENT']: new MetricsBlockHandler(
        'AI_AGENT' as any,
        this.createAIAgentHandler(),
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
   * Tries enhanced registry first, then falls back to legacy handlers.
   */
  getHandler(type: BlockType | string): BlockHandler {
    this.logger.debug(
      `BlockHandlerRegistry: Looking for handler for block type: ${type}`,
    );

    // First, try enhanced registry for generic blocks
    const enhancedHandler = this.enhancedRegistry.getHandler(type);
    if (enhancedHandler) {
      this.logger.debug(`Using enhanced handler for block type: ${type}`);
      return this.createEnhancedBlockWrapper(enhancedHandler, type);
    }

    this.logger.debug(
      `No enhanced handler found for ${type}, trying legacy handlers`,
    );

    // Fall back to legacy handlers
    if (this.handlers[type]) {
      this.logger.debug(`Using legacy handler for block type: ${type}`);
      return this.handlers[type];
    }

    // All custom blocks now use the unified CUSTOM type
    if (typeof type === 'string' && type.toUpperCase() === 'CUSTOM') {
      this.logger.debug(`Using CUSTOM handler for block type: ${type}`);
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
        this.logger.debug(
          `Found case-insensitive match: ${type} -> ${handlerKey}`,
        );
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
   * Create a wrapper to bridge enhanced blocks with the legacy BlockHandler interface
   */
  private createEnhancedBlockWrapper(
    enhancedHandler: any,
    blockType: string,
  ): BlockHandler {
    return {
      execute: async (node: any, context: BlockExecutionContext) => {
        try {
          this.logger.debug(`Executing enhanced block: ${blockType}`, {
            nodeId: node.id,
            executionId: context.executionId,
          });

          // Use the enhanced registry's execution method
          const result = await this.enhancedRegistry.executeBlock(
            node,
            context,
            context.previousOutputs || {},
          );

          this.logger.debug(
            `Enhanced block execution completed: ${blockType}`,
            {
              nodeId: node.id,
              executionId: context.executionId,
              hasResult: !!result,
            },
          );

          return result;
        } catch (error) {
          this.logger.error(`Enhanced block execution failed: ${blockType}`, {
            nodeId: node.id,
            executionId: context.executionId,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },

      validate: enhancedHandler.validate?.bind(enhancedHandler),
      getDefaultConfig: enhancedHandler.getDefaultConfig?.bind(enhancedHandler),
    };
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
   * Create AI Agent handler with proper dependency injection
   */
  private createAIAgentHandler(): AIAgentHandler {
    try {
      // Initialize AI Agent dependencies
      const cacheService = new CacheService(this.configService);
      const llmProviderManager = new LLMProviderManager(
        this.configService,
        cacheService,
      );
      const toolAnalyticsService = new ToolAnalyticsService(
        this.databaseService,
        cacheService,
      );
      const mcpServerManager = new MCPServerManager(
        this.databaseService,
        cacheService,
      );
      const securityValidator = new SecurityValidator(this.databaseService);
      const reasoningEngine = new ReasoningEngine(
        this.databaseService,
        toolAnalyticsService,
        cacheService,
      );

      // Create and return AI Agent handler
      const { GoatPluginManager } = require('./goat/GoatPluginManager');

      return new AIAgentHandler(
        this.databaseService,
        this.executionLogger,
        llmProviderManager,
        mcpServerManager,
        securityValidator,
        reasoningEngine,
        new GoatPluginManager(),
      );
    } catch (error) {
      this.logger.error('Failed to create AI Agent handler:', error);
      // Return a dummy handler that throws an error
      return {
        execute: async () => {
          throw new Error('AI Agent handler initialization failed');
        },
      } as unknown as AIAgentHandler;
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
