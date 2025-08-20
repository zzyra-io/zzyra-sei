import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BlockExecutionContext,
  BlockHandler,
  BlockType,
  EnhancedBlockExecutionContext,
  EnhancedBlockHandler,
  HttpRequestOptions,
  ZyraNodeData,
} from '@zzyra/types';
import { DatabaseService } from '../../../services/database.service';
import { ZyraTemplateProcessor } from '../../../utils/template-processor';
import { ExecutionLogger } from '../../execution-logger';

// Import enhanced blocks
import { HttpBlockHandler } from '../HttpBlockHandler';
import { NotificationBlockHandler } from '../NotificationBlockHandler';
import { PriceMonitorBlockHandler } from '../PriceMonitorBlockHandler';
import { CalculatorBlockHandler } from './CalculatorBlockHandler';
import { EnhancedComparatorBlock } from './EnhancedComparatorBlock';
import { MagicWalletBlockHandler } from './MagicWalletBlockHandler';

// Import blockchain blocks
import { ZeroDevService } from '../../../services/zerodev.service';
import { CheckBalanceBlock } from './blockchain/CheckBalanceBlock';
import { CreateWalletBlock } from './blockchain/CreateWalletBlock';
import { SendTransactionBlock } from './blockchain/SendTransactionBlock';
import { SwapTokensBlock } from './blockchain/SwapTokensBlock';
import { SeiDcaTradingBlock } from './trading/SeiDcaTradingBlock';

// Import legacy blocks
import { CustomBlockHandler } from '../CustomBlockHandler';
import { EmailBlockHandler } from '../EmailBlockHandler';
import { HttpRequestHandler } from '../HttpRequestHandler';

@Injectable()
export class EnhancedBlockRegistry {
  private readonly logger = new Logger(EnhancedBlockRegistry.name);
  private enhancedBlocks: Map<string, EnhancedBlockHandler> = new Map();
  private legacyBlocks: Map<string, BlockHandler> = new Map();

  constructor(
    private templateProcessor: ZyraTemplateProcessor,
    private databaseService: DatabaseService,
    private executionLogger: ExecutionLogger,
    private configService: ConfigService,
  ) {
    this.initializeBlocks();
  }

  private initializeBlocks(): void {
    // Register enhanced blocks
    this.registerEnhancedBlock(new HttpBlockHandler());
    this.registerEnhancedBlock(new EnhancedComparatorBlock());
    this.registerEnhancedBlock(
      new NotificationBlockHandler(this.databaseService),
    );
    this.registerEnhancedBlock(
      new PriceMonitorBlockHandler(this.databaseService),
    );
    this.registerEnhancedBlock(new CalculatorBlockHandler());
    this.registerEnhancedBlock(new MagicWalletBlockHandler());

    // Register blockchain blocks
    const zeroDevService = new ZeroDevService();
    // const pimlicoService = new PimlicoService();
    this.registerEnhancedBlock(
      new SendTransactionBlock(
        this.configService,
        zeroDevService,
        // pimlicoService, // Add Pimlico service
        this.databaseService,
      ),
    );
    this.registerEnhancedBlock(new SeiDcaTradingBlock(this.configService));
    this.registerEnhancedBlock(new CheckBalanceBlock());
    this.registerEnhancedBlock(new SwapTokensBlock());
    this.registerEnhancedBlock(new CreateWalletBlock());

    // Register legacy blocks for backward compatibility
    this.registerLegacyBlock(
      'EMAIL',
      new EmailBlockHandler(this.databaseService),
    );
    this.registerLegacyBlock('HTTP_REQUEST', new HttpRequestHandler());
    this.registerLegacyBlock(
      'CUSTOM',
      new CustomBlockHandler(this.databaseService),
    );

    this.logger.log(
      `Initialized ${this.enhancedBlocks.size} enhanced blocks and ${this.legacyBlocks.size} legacy blocks`,
    );
  }

  private registerEnhancedBlock(block: EnhancedBlockHandler): void {
    this.enhancedBlocks.set(block.definition.name, block);
    this.logger.debug(
      `Registered enhanced block: ${block.definition.displayName}`,
    );
  }

  private registerLegacyBlock(type: string, handler: BlockHandler): void {
    this.legacyBlocks.set(type, handler);
    this.logger.debug(`Registered legacy block: ${type}`);
  }

  /**
   * Get a block handler by type with consistent resolution and caching
   */
  getHandler(blockType: string): EnhancedBlockHandler | BlockHandler | null {
    if (!blockType || typeof blockType !== 'string') {
      this.logger.warn(`Invalid block type provided: ${blockType}`);
      return null;
    }

    // Normalize block type to prevent race conditions
    const normalizedType = blockType.trim();

    this.logger.debug(`Looking for handler for block type: ${normalizedType}`);

    // Use a deterministic lookup strategy to prevent race conditions
    const handler = this.findHandlerDeterministically(normalizedType);

    if (handler) {
      const handlerType = this.isEnhancedBlock(normalizedType)
        ? 'enhanced'
        : 'legacy';
      this.logger.debug(
        `Found ${handlerType} handler for block type: ${normalizedType}`,
      );
      return handler;
    }

    // Log detailed debugging information only when handler is not found
    this.logger.warn(`No handler found for block type: ${normalizedType}`);
    this.logger.debug(
      `Available enhanced blocks: ${Array.from(this.enhancedBlocks.keys()).join(', ')}`,
    );
    this.logger.debug(
      `Available legacy blocks: ${Array.from(this.legacyBlocks.keys()).join(', ')}`,
    );
    return null;
  }

  /**
   * Find handler using deterministic lookup strategy to prevent race conditions
   */
  private findHandlerDeterministically(
    blockType: string,
  ): EnhancedBlockHandler | BlockHandler | null {
    // Priority 1: Exact match in enhanced blocks
    if (this.enhancedBlocks.has(blockType)) {
      return this.enhancedBlocks.get(blockType)!;
    }

    // Priority 2: Exact match in legacy blocks
    if (this.legacyBlocks.has(blockType)) {
      return this.legacyBlocks.get(blockType)!;
    }

    // Priority 3: Case-insensitive match in enhanced blocks (deterministic order)
    const upperBlockType = blockType.toUpperCase();
    const enhancedKeys = Array.from(this.enhancedBlocks.keys()).sort(); // Sorted for determinism

    for (const key of enhancedKeys) {
      if (key.toUpperCase() === upperBlockType) {
        this.logger.debug(
          `Found case-insensitive match for enhanced block: ${blockType} -> ${key}`,
        );
        return this.enhancedBlocks.get(key)!;
      }
    }

    // Priority 4: Case-insensitive match in legacy blocks (deterministic order)
    const legacyKeys = Array.from(this.legacyBlocks.keys()).sort(); // Sorted for determinism

    for (const key of legacyKeys) {
      if (key.toUpperCase() === upperBlockType) {
        this.logger.debug(
          `Found case-insensitive match for legacy block: ${blockType} -> ${key}`,
        );
        return this.legacyBlocks.get(key)!;
      }
    }

    return null;
  }

  /**
   * Check if a block type is enhanced (new system)
   */
  isEnhancedBlock(blockType: string): boolean {
    // Try exact match first
    if (this.enhancedBlocks.has(blockType)) {
      return true;
    }

    // Try case-insensitive match
    const upperBlockType = blockType.toUpperCase();
    for (const key of this.enhancedBlocks.keys()) {
      if (key.toUpperCase() === upperBlockType) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a block type is legacy (old system)
   */
  isLegacyBlock(blockType: string): boolean {
    // Try exact match first
    if (this.legacyBlocks.has(blockType)) {
      return true;
    }

    // Try case-insensitive match
    const upperBlockType = blockType.toUpperCase();
    for (const key of this.legacyBlocks.keys()) {
      if (key.toUpperCase() === upperBlockType) {
        return true;
      }
    }

    return false;
  }

  /**
   * Execute a block with the appropriate handler
   */
  async executeBlock(
    node: any,
    context: BlockExecutionContext,
    previousOutputs: Record<string, any>,
  ): Promise<any> {
    const blockType = node.type || node.data?.type;
    const handler = this.getHandler(blockType);

    if (!handler) {
      throw new Error(`No handler found for block type: ${blockType}`);
    }

    if (this.isEnhancedBlock(blockType)) {
      return this.executeEnhancedBlock(
        handler as EnhancedBlockHandler,
        node,
        context,
        previousOutputs,
      );
    } else {
      return this.executeLegacyBlock(handler as BlockHandler, node, context);
    }
  }

  private async executeEnhancedBlock(
    handler: EnhancedBlockHandler,
    node: any,
    context: BlockExecutionContext,
    previousOutputs: Record<string, any>,
  ): Promise<any> {
    // Convert legacy context to enhanced context
    const enhancedContext = this.createEnhancedContext(
      node,
      context,
      previousOutputs,
    );

    try {
      this.logger.debug(`Executing enhanced block: ${node.type}`, {
        nodeId: node.id,
        executionId: context.executionId,
      });

      const result = await handler.execute(enhancedContext);

      this.logger.debug(`Enhanced block execution completed: ${node.type}`, {
        nodeId: node.id,
        executionId: context.executionId,
        hasResult: !!result,
      });

      // Convert enhanced result back to legacy format
      return this.convertEnhancedResultToLegacy(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Enhanced block execution failed: ${errorMessage}`, {
        blockType: node.type,
        nodeId: node.id,
        executionId: context.executionId,
      });
      throw error;
    }
  }

  private async executeLegacyBlock(
    handler: BlockHandler,
    node: any,
    context: BlockExecutionContext,
  ): Promise<any> {
    try {
      return await handler.execute(node, context);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Legacy block execution failed: ${errorMessage}`, {
        blockType: node.type,
        nodeId: node.id,
        executionId: context.executionId,
      });
      throw error;
    }
  }

  private createEnhancedContext(
    node: any,
    context: BlockExecutionContext,
    previousOutputs: Record<string, any>,
  ): EnhancedBlockExecutionContext {
    // Convert previous outputs to ZyraNodeData format while preserving structure
    const inputData: ZyraNodeData[] = [];

    if (previousOutputs && Object.keys(previousOutputs).length > 0) {
      // Convert each previous output to ZyraNodeData format
      // Preserve the block-specific structure for template processing
      for (const [blockId, output] of Object.entries(previousOutputs)) {
        if (output && typeof output === 'object') {
          inputData.push({
            json: output,
            pairedItem: { item: 0 },
            // Add metadata to track source block
            metadata: { sourceBlockId: blockId },
          } as ZyraNodeData);
        }
      }
    }

    // If no previous outputs, create empty data
    if (inputData.length === 0) {
      inputData.push({ json: {} });
    }

    // Create structured context for template processing
    const templateContext = {
      previousOutputs,
      blockOutputs: previousOutputs, // Alternative naming for clarity
      // Add current node data for fallback
      currentNode: node.data?.config || {},
    };

    // Create the node logger with proper fallback and validation
    let nodeLogger: any;
    const executionId = context.executionId || node.executionId;
    const nodeId = context.nodeId || node.id;

    if (executionId && nodeId) {
      try {
        nodeLogger = this.executionLogger.createNodeLogger(executionId, nodeId);
      } catch (error) {
        this.logger.error('Failed to create node logger, using fallback', {
          executionId,
          nodeId,
          error: error instanceof Error ? error.message : String(error),
        });
        nodeLogger = this.createFallbackLogger(executionId, nodeId);
      }
    } else {
      this.logger.error('Missing executionId or nodeId for logger creation', {
        executionId: context.executionId,
        nodeId: context.nodeId,
        nodeExecutionId: node.executionId,
        nodeIdFromNode: node.id,
      });
      nodeLogger = this.createFallbackLogger(
        executionId || 'unknown',
        nodeId || 'unknown',
      );
    }

    // Enhanced context with all critical fields populated
    const enhancedContext: EnhancedBlockExecutionContext = {
      ...context,
      // Ensure critical fields are always present
      executionId: executionId || context.executionId || 'unknown',
      nodeId: nodeId || context.nodeId || 'unknown',
      workflowId: context.workflowId || node.workflowId || 'unknown',
      userId: context.userId || 'unknown',
      logger: nodeLogger,

      getInputData: () => {
        return inputData;
      },

      getNodeParameter: (parameterName: string) => {
        const nodeData = node.data || {};
        const config = nodeData.config || {};
        return config[parameterName];
      },

      getCredentials: async () => {
        // For now, return empty credentials
        // This can be enhanced later to fetch from a credentials service
        return {};
      },

      getWorkflowStaticData: () => {
        // For now, return empty static data
        // This can be enhanced later to fetch from a static data service
        return {};
      },

      helpers: {
        httpRequest: async (options: HttpRequestOptions) => {
          // This can be enhanced to use a proper HTTP client
          const response = await fetch(options.url, {
            method: options.method || 'GET',
            headers: options.headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
          });
          return response.json();
        },

        processTemplate: (template: string, data: any) => {
          // Enhance template processing with structured context for cross-block data access
          return this.templateProcessor.process(
            template,
            data,
            templateContext,
          );
        },

        formatValue: (value: any, format?: string) => {
          if (format === 'json') {
            return JSON.stringify(value);
          }
          return String(value);
        },

        constructExecutionMetaData: (
          _inputData: ZyraNodeData[],
          outputData: any[],
        ) => {
          return outputData.map((item, index) => ({
            json: item,
            pairedItem: { item: index },
          }));
        },

        normalizeItems: (items: any) => {
          if (Array.isArray(items)) {
            return items.map((item, index) => ({
              json: item,
              pairedItem: { item: index },
            }));
          }
          return [{ json: items, pairedItem: { item: 0 } }];
        },

        returnJsonArray: (jsonData: any[]) => {
          return jsonData.map((item, index) => ({
            json: item,
            pairedItem: { item: index },
          }));
        },
      },
    };

    return enhancedContext;
  }

  /**
   * Create a fallback logger when the execution logger fails
   */
  private createFallbackLogger(executionId: string, nodeId: string) {
    return {
      info: (message: string, ...args: any[]) => {
        this.logger.log(`[${executionId}:${nodeId}] ${message}`, ...args);
      },
      warn: (message: string, ...args: any[]) => {
        this.logger.warn(`[${executionId}:${nodeId}] ${message}`, ...args);
      },
      error: (message: string, ...args: any[]) => {
        this.logger.error(`[${executionId}:${nodeId}] ${message}`, ...args);
      },
      debug: (message: string, ...args: any[]) => {
        this.logger.debug(`[${executionId}:${nodeId}] ${message}`, ...args);
      },
      log: (message: string, ...args: any[]) => {
        this.logger.log(`[${executionId}:${nodeId}] ${message}`, ...args);
      },
    };
  }

  private convertEnhancedResultToLegacy(result: ZyraNodeData[]): any {
    if (!Array.isArray(result) || result.length === 0) {
      return {};
    }

    // If single result, return just the json data
    if (result.length === 1) {
      return result[0].json;
    }

    // If multiple results, return array of json data
    return result.map((item) => item.json);
  }

  /**
   * Get all available block types
   */
  getAllBlockTypes(): string[] {
    return [
      ...Array.from(this.enhancedBlocks.keys()),
      ...Array.from(this.legacyBlocks.keys()),
    ];
  }

  /**
   * Get block definition for UI
   */
  getBlockDefinition(blockType: string): any {
    const handler = this.getHandler(blockType);

    if (!handler) {
      return null;
    }

    if (this.isEnhancedBlock(blockType)) {
      return (handler as EnhancedBlockHandler).definition;
    }

    // For legacy blocks, create a basic definition
    return {
      displayName: blockType,
      name: blockType,
      version: 1,
      description: `Legacy ${blockType} block`,
      icon: 'legacy',
      color: '#6B7280',
      group: ['action'],
      properties: [],
    };
  }

  /**
   * Health check for the registry
   */
  getHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    enhancedBlocks: number;
    legacyBlocks: number;
    totalBlocks: number;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check for essential blocks
    const essentialBlocks = [BlockType.HTTP_REQUEST, BlockType.CONDITION];
    for (const blockType of essentialBlocks) {
      if (!this.enhancedBlocks.has(blockType)) {
        issues.push(`Missing essential enhanced block: ${blockType}`);
      }
    }

    // Check for legacy fallbacks
    const legacyFallbacks = ['EMAIL', 'CUSTOM'];
    for (const blockType of legacyFallbacks) {
      if (!this.legacyBlocks.has(blockType)) {
        issues.push(`Missing legacy fallback: ${blockType}`);
      }
    }

    const status =
      issues.length === 0
        ? 'healthy'
        : issues.length <= 2
          ? 'degraded'
          : 'unhealthy';

    return {
      status,
      enhancedBlocks: this.enhancedBlocks.size,
      legacyBlocks: this.legacyBlocks.size,
      totalBlocks: this.enhancedBlocks.size + this.legacyBlocks.size,
      issues,
    };
  }
}
