import retry from 'async-retry';
import { BlockExecutionContext, BlockHandler } from '@zyra/types';
import { Logger } from '@nestjs/common';

/**
 * Generic HTTP Request Handler
 * Can fetch data from any HTTP endpoint and extract specific fields
 * Maintains backward compatibility with price monitoring configurations
 */
export class HttpRequestHandler implements BlockHandler {
  private readonly logger = new Logger(HttpRequestHandler.name);

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const { nodeId } = ctx;
    const cfg = (node.data as any).config;

    // Check if this is a legacy price monitor configuration
    if (cfg.asset && !cfg.url) {
      return this.executeLegacyPriceMonitor(cfg, ctx);
    }

    // Generic HTTP request execution
    return this.executeHttpRequest(cfg, ctx);
  }

  /**
   * Execute generic HTTP request
   */
  private async executeHttpRequest(
    cfg: any,
    ctx: BlockExecutionContext,
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
      const processedUrl = this.processTemplate(url, ctx.inputs || {});
      const processedHeaders = this.processTemplateObject(
        headers,
        ctx.inputs || {},
      );
      const processedBody = body
        ? this.processTemplateObject(body, ctx.inputs || {})
        : undefined;

      const response = await retry(
        async () => {
          const fetchOptions: RequestInit = {
            method,
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
          onRetry: (error, attempt) => {
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
        method,
        timestamp: new Date().toISOString(),
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
    // Implementation would use the database service to store this data
  }
}
