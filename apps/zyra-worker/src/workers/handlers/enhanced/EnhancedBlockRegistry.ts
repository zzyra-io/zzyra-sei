import { Injectable, Logger } from '@nestjs/common';
import {
  BlockHandler,
  EnhancedBlockHandler,
  BlockExecutionContext,
  EnhancedBlockExecutionContext,
  ZyraNodeData,
  BlockType,
  getBlockType,
  getBlockMetadata,
  HttpRequestOptions,
} from '@zyra/types';
import { ZyraTemplateProcessor } from '../../../utils/template-processor';
import { DatabaseService } from '../../../services/database.service';
import { ExecutionLogger } from '../../execution-logger';

// Import enhanced blocks
import { HttpBlockHandler } from '../HttpBlockHandler';
import { EnhancedComparatorBlock } from './EnhancedComparatorBlock';
import { NotificationBlockHandler } from '../NotificationBlockHandler';
import { PriceMonitorBlockHandler } from '../PriceMonitorBlockHandler';

// Import legacy blocks
import { EmailBlockHandler } from '../EmailBlockHandler';
import { HttpRequestHandler } from '../HttpRequestHandler';
import { CustomBlockHandler } from '../CustomBlockHandler';

@Injectable()
export class EnhancedBlockRegistry {
  private readonly logger = new Logger(EnhancedBlockRegistry.name);
  private enhancedBlocks: Map<string, EnhancedBlockHandler> = new Map();
  private legacyBlocks: Map<string, BlockHandler> = new Map();

  constructor(
    private templateProcessor: ZyraTemplateProcessor,
    private databaseService: DatabaseService,
    private executionLogger: ExecutionLogger,
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
   * Get a block handler by type (enhanced or legacy)
   */
  getHandler(blockType: string): EnhancedBlockHandler | BlockHandler | null {
    this.logger.debug(`Looking for handler for block type: ${blockType}`);

    // Try exact match first
    if (this.enhancedBlocks.has(blockType)) {
      this.logger.debug(`Found exact match for enhanced block: ${blockType}`);
      return this.enhancedBlocks.get(blockType)!;
    }

    // Try case-insensitive match for enhanced blocks
    const upperBlockType = blockType.toUpperCase();
    for (const [key, handler] of this.enhancedBlocks.entries()) {
      if (key.toUpperCase() === upperBlockType) {
        this.logger.debug(
          `Found case-insensitive match for enhanced block: ${blockType} -> ${key}`,
        );
        return handler;
      }
    }

    // Fall back to legacy blocks with exact match
    if (this.legacyBlocks.has(blockType)) {
      this.logger.debug(`Found exact match for legacy block: ${blockType}`);
      return this.legacyBlocks.get(blockType)!;
    }

    // Try case-insensitive match for legacy blocks
    for (const [key, handler] of this.legacyBlocks.entries()) {
      if (key.toUpperCase() === upperBlockType) {
        this.logger.debug(
          `Found case-insensitive match for legacy block: ${blockType} -> ${key}`,
        );
        return handler;
      }
    }

    this.logger.warn(`No handler found for block type: ${blockType}`);
    this.logger.debug(
      `Available enhanced blocks: ${Array.from(this.enhancedBlocks.keys()).join(', ')}`,
    );
    this.logger.debug(
      `Available legacy blocks: ${Array.from(this.legacyBlocks.keys()).join(', ')}`,
    );
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
    // Convert previous outputs to ZyraNodeData format
    const inputData: ZyraNodeData[] = [];

    if (previousOutputs && Object.keys(previousOutputs).length > 0) {
      // Convert each previous output to ZyraNodeData format
      for (const [nodeId, output] of Object.entries(previousOutputs)) {
        if (output && typeof output === 'object') {
          inputData.push({
            json: output,
            pairedItem: { item: 0 },
          });
        }
      }
    }

    // If no previous outputs, create empty data
    if (inputData.length === 0) {
      inputData.push({ json: {} });
    }

    // Create the node logger
    let nodeLogger;
    if (context.executionId && context.nodeId) {
      nodeLogger = this.executionLogger.createNodeLogger(
        context.executionId,
        context.nodeId,
      );
    } else {
      this.logger.error('Missing executionId or nodeId for logger creation', {
        executionId: context.executionId,
        nodeId: context.nodeId,
      });
      // No-op logger to avoid crashes
      nodeLogger = {
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
        log: () => {},
      };
    }
    // Contract: context.logger must always be safe to call and log to node_logs if possible.
    return {
      ...context,
      logger: nodeLogger,

      getInputData: (inputIndex = 0) => {
        return inputData;
      },

      getNodeParameter: (parameterName: string, itemIndex = 0) => {
        const nodeData = node.data || {};
        const config = nodeData.config || {};
        return config[parameterName];
      },

      getCredentials: async (type: string) => {
        // For now, return empty credentials
        // This can be enhanced later to fetch from a credentials service
        return {};
      },

      getWorkflowStaticData: (type: string) => {
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
          return this.templateProcessor.process(template, data);
        },

        formatValue: (value: any, format?: string) => {
          if (format === 'json') {
            return JSON.stringify(value);
          }
          return String(value);
        },

        constructExecutionMetaData: (
          inputData: ZyraNodeData[],
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
