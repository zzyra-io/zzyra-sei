import { Injectable, Logger } from '@nestjs/common';
import { 
  BlockHandler, 
  EnhancedBlockHandler, 
  BlockExecutionContext, 
  EnhancedBlockExecutionContext,
  ZyraNodeData,
  GenericBlockType
} from '@zyra/types';
import { ZyraTemplateProcessor } from '../../../utils/template-processor';

// Import enhanced blocks
import { EnhancedHttpBlock } from './EnhancedHttpBlock';
import { EnhancedComparatorBlock } from './EnhancedComparatorBlock';

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
    private templateProcessor: ZyraTemplateProcessor
  ) {
    this.initializeBlocks();
  }

  private initializeBlocks(): void {
    // Register enhanced blocks
    this.registerEnhancedBlock(new EnhancedHttpBlock());
    this.registerEnhancedBlock(new EnhancedComparatorBlock());
    
    // Register legacy blocks for backward compatibility
    this.registerLegacyBlock('EMAIL', new EmailBlockHandler());
    this.registerLegacyBlock('HTTP_REQUEST', new HttpRequestHandler());
    this.registerLegacyBlock('PRICE_MONITOR', new HttpRequestHandler());
    this.registerLegacyBlock('CUSTOM', new CustomBlockHandler());
    
    this.logger.log(`Initialized ${this.enhancedBlocks.size} enhanced blocks and ${this.legacyBlocks.size} legacy blocks`);
  }

  private registerEnhancedBlock(block: EnhancedBlockHandler): void {
    this.enhancedBlocks.set(block.definition.name, block);
    this.logger.debug(`Registered enhanced block: ${block.definition.displayName}`);
  }

  private registerLegacyBlock(type: string, handler: BlockHandler): void {
    this.legacyBlocks.set(type, handler);
    this.logger.debug(`Registered legacy block: ${type}`);
  }

  /**
   * Get a block handler by type (enhanced or legacy)
   */
  getHandler(blockType: string): EnhancedBlockHandler | BlockHandler | null {
    // Try enhanced blocks first
    if (this.enhancedBlocks.has(blockType)) {
      return this.enhancedBlocks.get(blockType)!;
    }

    // Fall back to legacy blocks
    if (this.legacyBlocks.has(blockType)) {
      return this.legacyBlocks.get(blockType)!;
    }

    this.logger.warn(`No handler found for block type: ${blockType}`);
    return null;
  }

  /**
   * Check if a block type is enhanced (new system)
   */
  isEnhancedBlock(blockType: string): boolean {
    return this.enhancedBlocks.has(blockType);
  }

  /**
   * Check if a block type is legacy (old system)
   */
  isLegacyBlock(blockType: string): boolean {
    return this.legacyBlocks.has(blockType);
  }

  /**
   * Execute a block with the appropriate handler
   */
  async executeBlock(
    node: any,
    context: BlockExecutionContext,
    previousOutputs: Record<string, any>
  ): Promise<any> {
    const blockType = node.type || node.data?.type;
    const handler = this.getHandler(blockType);

    if (!handler) {
      throw new Error(`No handler found for block type: ${blockType}`);
    }

    if (this.isEnhancedBlock(blockType)) {
      return this.executeEnhancedBlock(handler as EnhancedBlockHandler, node, context, previousOutputs);
    } else {
      return this.executeLegacyBlock(handler as BlockHandler, node, context);
    }
  }

  private async executeEnhancedBlock(
    handler: EnhancedBlockHandler,
    node: any,
    context: BlockExecutionContext,
    previousOutputs: Record<string, any>
  ): Promise<any> {
    // Convert legacy context to enhanced context
    const enhancedContext = this.createEnhancedContext(node, context, previousOutputs);
    
    try {
      const result = await handler.execute(enhancedContext);
      
      // Convert enhanced result back to legacy format
      return this.convertEnhancedResultToLegacy(result);
    } catch (error) {
      this.logger.error(`Enhanced block execution failed: ${error.message}`, {
        blockType: node.type,
        nodeId: node.id,
        executionId: context.executionId
      });
      throw error;
    }
  }

  private async executeLegacyBlock(
    handler: BlockHandler,
    node: any,
    context: BlockExecutionContext
  ): Promise<any> {
    try {
      return await handler.execute(node, context);
    } catch (error) {
      this.logger.error(`Legacy block execution failed: ${error.message}`, {
        blockType: node.type,
        nodeId: node.id,
        executionId: context.executionId
      });
      throw error;
    }
  }

  private createEnhancedContext(
    node: any,
    context: BlockExecutionContext,
    previousOutputs: Record<string, any>
  ): EnhancedBlockExecutionContext {
    // Convert previous outputs to ZyraNodeData format
    const inputData: ZyraNodeData[] = [];
    
    if (previousOutputs && Object.keys(previousOutputs).length > 0) {
      // Convert each previous output to ZyraNodeData format
      for (const [nodeId, output] of Object.entries(previousOutputs)) {
        if (output && typeof output === 'object') {
          inputData.push({
            json: output,
            pairedItem: { item: 0 }
          });
        }
      }
    }

    // If no previous outputs, create empty data
    if (inputData.length === 0) {
      inputData.push({ json: {} });
    }

    return {
      ...context,
      
      getInputData: (inputIndex = 0) => {
        return inputData;
      },

      getNodeParameter: (parameterName: string, itemIndex = 0) => {
        const nodeData = node.data || {};
        return nodeData[parameterName] !== undefined ? nodeData[parameterName] : node[parameterName];
      },

      getCredentials: async (type: string) => {
        // TODO: Implement credential retrieval
        return null;
      },

      getWorkflowStaticData: (type: string) => {
        // TODO: Implement workflow static data retrieval
        return {};
      },

      helpers: {
        httpRequest: async (options: any) => {
          // TODO: Implement HTTP request helper
          throw new Error('HTTP request helper not implemented');
        },

        processTemplate: (template: string, data: any) => {
          return this.templateProcessor.process(template, data, context);
        },

        formatValue: (value: any, format?: string) => {
          if (format === 'currency') {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(Number(value));
          }
          
          if (format === 'date') {
            return new Date(value).toISOString();
          }
          
          return String(value);
        },

        constructExecutionMetaData: (inputData: ZyraNodeData[], outputData: any[]) => {
          return outputData.map((data, index) => ({
            json: data,
            pairedItem: inputData[index]?.pairedItem || { item: index }
          }));
        },

        normalizeItems: (items: any) => {
          if (!Array.isArray(items)) {
            return [{ json: items }];
          }
          
          return items.map(item => ({
            json: item
          }));
        },

        returnJsonArray: (jsonData: any[]) => {
          return jsonData.map(data => ({ json: data }));
        }
      }
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
    return result.map(item => item.json);
  }

  /**
   * Get all available block types
   */
  getAllBlockTypes(): string[] {
    return [
      ...Array.from(this.enhancedBlocks.keys()),
      ...Array.from(this.legacyBlocks.keys())
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
      properties: []
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
    const essentialBlocks = [GenericBlockType.HTTP_REQUEST, GenericBlockType.COMPARATOR];
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

    const status = issues.length === 0 ? 'healthy' : 
                   issues.length <= 2 ? 'degraded' : 'unhealthy';

    return {
      status,
      enhancedBlocks: this.enhancedBlocks.size,
      legacyBlocks: this.legacyBlocks.size,
      totalBlocks: this.enhancedBlocks.size + this.legacyBlocks.size,
      issues
    };
  }
}