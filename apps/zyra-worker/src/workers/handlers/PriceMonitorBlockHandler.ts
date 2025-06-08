import { fetchCryptoPrice, PriceData } from '../../lib/services/price-service';
import retry from 'async-retry';
import { BlockExecutionContext, BlockHandler } from '@zyra/types';
import { Logger } from '@nestjs/common';

/**
 * Handler for price monitoring block
 * Fetches cryptocurrency prices from specified data sources
 */
export class PriceMonitorBlockHandler implements BlockHandler {
  private readonly logger = new Logger(PriceMonitorBlockHandler.name);
  
  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const { nodeId } = ctx;
    const cfg = (node.data as any).config;
    const asset = cfg.asset;
    const dataSource = cfg.dataSource || 'coingecko';
    
    this.logger.log(`Executing PriceMonitor block: ${nodeId} for asset: ${asset}`);

    if (!asset) {
      throw new Error('Asset is required for price monitoring');
    }

    try {
      // Fetch price data with retry logic
      const priceData: PriceData = await retry(
        async () => fetchCryptoPrice(
          asset, 
          dataSource as 'coingecko' | 'binance' | 'coinmarketcap'
        ),
        {
          retries: 3,
          factor: 2,
          minTimeout: 1000,
          maxTimeout: 5000,
          onRetry: (error, attempt) => {
            this.logger.warn(`Retry attempt ${attempt} for ${asset}: ${error.message}`);
          }
        },
      );

      const currentPrice = priceData.price;
      this.logger.log(`Fetched price for ${asset}: $${currentPrice} from ${dataSource}`);

      // If conditions are specified, evaluate them
      let conditionMet = true; // Default to true for simple price fetching

      if (cfg.condition && cfg.targetPrice) {
        const targetPrice = Number(cfg.targetPrice);

        switch (cfg.condition) {
          case 'above':
            conditionMet = currentPrice > targetPrice;
            break;
          case 'below':
            conditionMet = currentPrice < targetPrice;
            break;
          case 'equals':
            conditionMet = Math.abs(currentPrice - targetPrice) < 0.01;
            break;
          case 'change':
            // For change detection, we would need historical data
            // For now, just mark as true
            conditionMet = true;
            this.logger.warn(`Change detection not fully implemented for ${asset}`);
            break;
          default:
            throw new Error(`Unknown condition: ${cfg.condition}`);
        }
        
        this.logger.log(
          `Condition evaluation for ${asset}: ${cfg.condition} ${targetPrice}, result: ${conditionMet}`
        );
      }

      // Store historical price data for this asset and user if needed for future reference
      await this.storeHistoricalData(ctx.userId, asset, currentPrice);

      return {
        asset,
        currentPrice,
        targetPrice: cfg.targetPrice ? Number(cfg.targetPrice) : null,
        condition: cfg.condition || null,
        conditionMet,
        formatted: {
          price: `$${currentPrice.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`,
          asset: asset.charAt(0).toUpperCase() + asset.slice(1) // Capitalize asset name
        },
        timestamp: priceData.timestamp,
        dataSource: priceData.source,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch price for ${asset}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Store historical price data for trend analysis
   * This is a placeholder for actual implementation
   */
  private async storeHistoricalData(userId: string, asset: string, price: number): Promise<void> {
    // In a real implementation, this would store the price in a database
    // For now, just log it
    this.logger.debug(`Would store historical price for ${userId}: ${asset} = $${price}`);
    
    // Implementation would use the database service to store this data
    // Example:
    // await this.databaseService.prisma.priceHistory.create({
    //   data: {
    //     userId,
    //     asset,
    //     price,
    //     timestamp: new Date()
    //   }
    // });
  }
}
