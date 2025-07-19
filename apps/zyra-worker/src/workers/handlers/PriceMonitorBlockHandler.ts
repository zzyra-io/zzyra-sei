import { Injectable, Logger } from '@nestjs/common';
import { BlockExecutionContext, BlockHandler } from '@zyra/types';
import { DatabaseService } from '../../services/database.service';
import axios from 'axios';

@Injectable()
export class PriceMonitorBlockHandler implements BlockHandler {
  private readonly logger = new Logger(PriceMonitorBlockHandler.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const { nodeId, executionId, userId } = ctx;
    const config = (node.data as any).config;

    this.logger.log(`Executing Price Monitor block: ${nodeId}`);

    try {
      // Validate required fields
      if (!config.currency) {
        throw new Error('Currency is required');
      }

      // Get price data
      const priceData = await this.getCurrentPrice(config.currency);

      // Check if condition is met
      const conditionMet = this.evaluateCondition(
        priceData.price,
        config.condition,
        config.threshold,
      );

      // Log the price check
      await this.logPriceCheck(userId, executionId, nodeId, {
        currency: config.currency,
        currentPrice: priceData.price,
        condition: config.condition,
        threshold: config.threshold,
        conditionMet,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        data: {
          currency: config.currency,
          currentPrice: priceData.price,
          formattedPrice: `$${priceData.price.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          condition: config.condition,
          threshold: config.threshold,
          conditionMet,
          timestamp: new Date().toISOString(),
          // For template processing
          asset: config.currency,
          price: priceData.price,
          formatted: {
            price: `$${priceData.price.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            currency: config.currency,
          },
        },
      };
    } catch (error: any) {
      this.logger.error(`Price monitoring failed: ${error.message}`);

      // Log failed price check
      await this.logPriceCheck(userId, executionId, nodeId, {
        currency: config.currency || 'unknown',
        status: 'failed',
        error: error.message,
      });

      throw error;
    }
  }

  private async getCurrentPrice(currency: string): Promise<{ price: number }> {
    try {
      // Use CoinGecko API for price data
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${currency.toLowerCase()}&vs_currencies=usd`,
        {
          timeout: 10000,
        },
      );

      const price = response.data[currency.toLowerCase()]?.usd;
      if (!price) {
        throw new Error(`Could not get price for ${currency}`);
      }

      return { price };
    } catch (error) {
      this.logger.error(
        `Failed to fetch price for ${currency}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new Error(`Failed to fetch price for ${currency}`);
    }
  }

  private evaluateCondition(
    currentPrice: number,
    condition: string,
    threshold: number,
  ): boolean {
    switch (condition) {
      case 'greater_than':
        return currentPrice > threshold;
      case 'greater_than_or_equal':
        return currentPrice >= threshold;
      case 'less_than':
        return currentPrice < threshold;
      case 'less_than_or_equal':
        return currentPrice <= threshold;
      case 'equals':
        return currentPrice === threshold;
      case 'not_equals':
        return currentPrice !== threshold;
      default:
        throw new Error(`Unknown condition: ${condition}`);
    }
  }

  private async logPriceCheck(
    userId: string,
    executionId: string,
    nodeId: string,
    data: Record<string, any>,
  ): Promise<void> {
    try {
      await this.databaseService.prisma.executionLog.create({
        data: {
          executionId,
          level: 'info',
          message: 'Price check completed',
          metadata: data,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log price check: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
