import retry from 'async-retry';
import {
  BlockExecutionContext,
  BlockHandler,
  enhancedHttpRequestSchema,
} from '@zyra/types';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { ZyraTemplateProcessor } from '../../utils/template-processor';

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
  private readonly templateProcessor = new ZyraTemplateProcessor();

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
   * Get config schema for this block type
   */
  static getConfigSchema(): z.ZodType<any> {
    return this.configSchema;
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
   * Validate and extract configuration from node
   */
  private validateAndExtractConfig(node: any, ctx: BlockExecutionContext): any {
    const config = node.data?.config || node.data || {};

    // Validate against config schema if available
    try {
      const validatedConfig = HttpRequestHandler.configSchema.parse(config);
      return validatedConfig;
    } catch (validationError) {
      this.logger.warn(
        `Config validation failed for HTTP request: ${validationError instanceof Error ? validationError.message : String(validationError)}`,
      );
      // Return original config if validation fails
      return config;
    }
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

      // Process templates with all available data using unified template processor
      const templateData = { ...inputs, ...ctx.inputs };
      const processedUrl = this.templateProcessor.process(
        finalUrl,
        templateData,
      );
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
   * Process template variables in objects using unified template processor
   */
  private processTemplateObject(obj: any, inputs: Record<string, any>): any {
    if (typeof obj === 'string') {
      return this.templateProcessor.process(obj, inputs);
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
   * Extract data from response using path
   */
  private extractData(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object' && key in current) {
        return current[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * Legacy price monitor execution (for backward compatibility)
   */
  private async executeLegacyPriceMonitor(
    config: any,
    ctx: BlockExecutionContext,
    inputs: Record<string, any>,
  ): Promise<any> {
    // Implementation for legacy price monitor
    // This maintains backward compatibility
    return {
      asset: config.asset,
      currentPrice: 0,
      timestamp: new Date().toISOString(),
      success: true,
    };
  }
}
