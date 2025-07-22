import retry from 'async-retry';
import {
  BlockExecutionContext,
  BlockHandler,
  enhancedHttpRequestSchema,
} from '@zyra/types';
import { Logger } from '@nestjs/common';
import { z } from 'zod';

/**
 * Generic HTTP Request Handler
 * Schema-first design with input/output validation
 * Maintains backward compatibility with price monitoring configurations
 */
export class HttpRequestHandler implements BlockHandler {
  // Use the enhanced schema from @zyra/types
  static readonly inputSchema = enhancedHttpRequestSchema.inputSchema;
  static readonly outputSchema = enhancedHttpRequestSchema.outputSchema;
  static readonly configSchema = enhancedHttpRequestSchema.configSchema;
  private readonly logger = new Logger(HttpRequestHandler.name);

  /**
   * Get input schema for this block type
   */
  static getInputSchema(): z.ZodObject<any> {
    return this.inputSchema;
  }

  /**
   * Get output schema for this block type
   */
  static getOutputSchema(): z.ZodObject<any> {
    return this.outputSchema;
  }

  /**
   * Get configuration schema for this block type
   */
  static getConfigSchema(): z.ZodObject<any> {
    return this.configSchema;
  }

  /**
   * Validate configuration
   */
  static validateConfig(config: any): any {
    return this.configSchema.parse(config);
  }

  /**
   * Check if this block can connect to another block
   */
  static canConnectTo(targetBlockHandler: any): boolean {
    if (!targetBlockHandler.getInputSchema) {
      return true; // Assume compatibility with legacy blocks
    }

    // In future: implement schema compatibility checking
    // For now: allow all connections
    return true;
  }

  /**
   * Main execution method with schema validation
   */
  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    try {
      // Validate and extract configuration
      const config = this.validateAndExtractConfig(node, ctx);

      // Validate inputs from previous blocks
      const inputs = this.validateInputs(
        ctx.inputs || {},
        ctx.previousOutputs || {},
        ctx,
      );

      // Check if this is a legacy price monitor configuration
      if (config.asset && !config.url) {
        const result = await this.executeLegacyPriceMonitor(
          config,
          ctx,
          inputs,
        );
        return result; // Legacy format
      }

      // Execute generic HTTP request
      const result = await this.executeHttpRequest(config, ctx, inputs);
      return result; // Schema-validated result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      ctx.logger.error(`HTTP block execution failed: ${errorMsg}`);

      // Return error in legacy format for backward compatibility
      return {
        statusCode: 0,
        data: null,
        headers: {},
        url: '',
        method: 'GET',
        timestamp: new Date().toISOString(),
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Validate configuration and merge with inputs
   */
  private validateAndExtractConfig(
    node: any,
    _ctx: BlockExecutionContext,
  ): any {
    const cfg = (node.data as any)?.config || {};

    // Validate configuration against schema
    const validatedConfig = HttpRequestHandler.configSchema.parse(cfg);

    return validatedConfig;
  }

  /**
   * Validate and process inputs from previous blocks
   */
  private validateInputs(
    inputs: Record<string, any>,
    previousOutputs: Record<string, any>,
    ctx: BlockExecutionContext,
  ): any {
    // Merge inputs and previousOutputs for template processing
    const allInputs = { ...previousOutputs, ...inputs };

    // Structure the data according to the schema
    const structuredInputs = {
      data: allInputs,
      context: {
        workflowId: ctx.workflowId,
        executionId: ctx.executionId,
        userId: ctx.userId,
        timestamp: new Date().toISOString(),
      },
      variables: {}, // Add any workflow variables if available
    };

    // Validate against input schema (non-strict for flexibility)
    const result = HttpRequestHandler.inputSchema.safeParse(structuredInputs);

    if (!result.success) {
      // Log warning but don't fail - inputs are optional overrides
      console.warn('Input validation warning:', result.error.message);
    }

    return allInputs;
  }

  // formatOutput method removed - maintaining backward compatibility

  /**
   * Execute generic HTTP request with enhanced input processing
   */
  private async executeHttpRequest(
    cfg: any,
    ctx: BlockExecutionContext,
    inputs: Record<string, any>,
  ): Promise<any> {
    const {
      url,
      method = 'GET',
      headers = {},
      body,
      dataPath,
      retries = 3,
      timeout = 10000,
    } = cfg;

    this.logger.log(`Executing HTTP ${method} request: ${url}`);

    if (!url) {
      throw new Error('URL is required for HTTP requests');
    }

    try {
      // Allow input override of configuration
      const finalUrl = inputs.url || url;
      const finalMethod = inputs.method || method;
      const finalHeaders = { ...headers, ...inputs.headers };
      const finalBody = inputs.body || body;

      // Process templates with all available data
      const templateData = { ...inputs, ...ctx.inputs };
      const processedUrl = this.processTemplate(finalUrl, templateData);
      const processedHeaders = this.processTemplateObject(
        finalHeaders,
        templateData,
      );
      const processedBody = finalBody
        ? this.processTemplateObject(finalBody, templateData)
        : undefined;

      const response = await retry(
        async () => {
          const fetchOptions: RequestInit = {
            method: finalMethod,
            headers: {
              'Content-Type': 'application/json',
              ...processedHeaders,
            },
            signal: AbortSignal.timeout(timeout),
          };

          if (processedBody && method !== 'GET') {
            fetchOptions.body = JSON.stringify(processedBody);
          }

          const res = await fetch(processedUrl, fetchOptions);

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }

          return res;
        },
        {
          retries,
          factor: 2,
          minTimeout: 1000,
          maxTimeout: 5000,
          onRetry: (error: Error, attempt: number) => {
            this.logger.warn(
              `Retry attempt ${attempt} for ${url}: ${error.message}`,
            );
          },
        },
      );

      const data = await response.json();

      // Extract specific data if path provided
      const result = dataPath ? this.extractData(data, dataPath) : data;

      return {
        statusCode: response.status,
        data: result,
        headers: Object.fromEntries(response.headers.entries()),
        url: processedUrl,
        method: finalMethod,
        timestamp: new Date().toISOString(),
        success: true,
      };
    } catch (error) {
      this.logger.error(
        `HTTP request failed for ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Backward compatibility: Execute legacy price monitor configuration
   */
  private async executeLegacyPriceMonitor(
    cfg: any,
    ctx: BlockExecutionContext,
    inputs: Record<string, any>,
  ): Promise<any> {
    const { asset, dataSource = 'coingecko', condition, targetPrice } = cfg;

    this.logger.log(`Executing legacy price monitor for asset: ${asset}`);

    if (!asset) {
      throw new Error('Asset is required for price monitoring');
    }

    // Convert legacy config to HTTP request
    const url = this.buildPriceUrl(asset, dataSource);
    const dataPath = this.buildPriceDataPath(asset, dataSource);

    try {
      const httpResult = await this.executeHttpRequest(
        {
          url,
          method: 'GET',
          dataPath,
          retries: 3,
        },
        ctx,
        inputs,
      );

      const currentPrice = httpResult.data;

      // Legacy condition evaluation
      let conditionMet = true;
      if (condition && targetPrice) {
        const target = Number(targetPrice);
        switch (condition) {
          case 'above':
            conditionMet = currentPrice > target;
            break;
          case 'below':
            conditionMet = currentPrice < target;
            break;
          case 'equals':
            conditionMet = Math.abs(currentPrice - target) < 0.01;
            break;
          default:
            this.logger.warn(`Unknown condition: ${condition}`);
        }
      }

      // Store historical data if needed
      await this.storeHistoricalData(ctx.userId, asset, currentPrice);

      // Return legacy format for backward compatibility
      return {
        asset,
        currentPrice,
        targetPrice: targetPrice ? Number(targetPrice) : null,
        condition: condition || null,
        conditionMet,
        formatted: {
          price: `$${currentPrice.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          asset: asset.charAt(0).toUpperCase() + asset.slice(1),
        },
        timestamp: httpResult.timestamp,
        dataSource: dataSource,
        // Include new format too
        statusCode: httpResult.statusCode,
        data: currentPrice,
        success: true,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch price for ${asset}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Process template variables in strings
   */
  private processTemplate(
    template: string,
    inputs: Record<string, any>,
  ): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(inputs, path);
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Process template variables in objects
   */
  private processTemplateObject(obj: any, inputs: Record<string, any>): any {
    if (typeof obj === 'string') {
      return this.processTemplate(obj, inputs);
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.processTemplateObject(item, inputs));
    }
    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.processTemplateObject(value, inputs);
      }
      return result;
    }
    return obj;
  }

  /**
   * Extract data from object using dot notation path
   */
  private extractData(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
  }

  /**
   * Build price API URL for legacy configurations
   */
  private buildPriceUrl(asset: string, dataSource: string): string {
    const assetLower = asset.toLowerCase();
    switch (dataSource) {
      case 'coingecko':
        return `https://api.coingecko.com/api/v3/simple/price?ids=${assetLower}&vs_currencies=usd`;
      case 'binance':
        return `https://api.binance.com/api/v3/ticker/price?symbol=${asset.toUpperCase()}USDT`;
      case 'coinmarketcap':
        return `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${asset.toUpperCase()}`;
      default:
        return `https://api.coingecko.com/api/v3/simple/price?ids=${assetLower}&vs_currencies=usd`;
    }
  }

  /**
   * Build data extraction path for legacy configurations
   */
  private buildPriceDataPath(asset: string, dataSource: string): string {
    const assetLower = asset.toLowerCase();
    switch (dataSource) {
      case 'coingecko':
        return `${assetLower}.usd`;
      case 'binance':
        return 'price';
      case 'coinmarketcap':
        return `data.${asset.toUpperCase()}.quote.USD.price`;
      default:
        return `${assetLower}.usd`;
    }
  }

  /**
   * Store historical price data for trend analysis
   */
  private async storeHistoricalData(
    userId: string,
    asset: string,
    price: number,
  ): Promise<void> {
    this.logger.debug(
      `Would store historical price for ${userId}: ${asset} = $${price}`,
    );
    // TODO: Implementation would use the database service to store this data
    // This is a placeholder for historical data storage
  }
}
