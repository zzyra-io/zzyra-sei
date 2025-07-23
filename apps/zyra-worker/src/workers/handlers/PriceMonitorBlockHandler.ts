import {
  EnhancedBlockHandler,
  EnhancedBlockDefinition,
  EnhancedBlockExecutionContext,
  ZyraNodeData,
  BlockType,
  BlockGroup,
  ConnectionType,
  PropertyType,
  ValidationResult,
} from '@zyra/types';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { DatabaseService } from '../../services/database.service';

@Injectable()
export class PriceMonitorBlockHandler implements EnhancedBlockHandler {
  private readonly logger = new Logger(PriceMonitorBlockHandler.name);

  constructor(private readonly databaseService: DatabaseService) {}

  definition: EnhancedBlockDefinition = {
    displayName: 'Price Monitor',
    name: BlockType.PRICE_MONITOR,
    version: 1,
    description: 'Monitor cryptocurrency prices with conditional triggers',
    icon: 'trending-up',
    color: '#F59E0B',
    group: [BlockGroup.TRIGGER],
    inputs: [ConnectionType.MAIN],
    outputs: [ConnectionType.MAIN],

    properties: [
      {
        displayName: 'Asset',
        name: 'asset',
        type: PropertyType.STRING,
        required: true,
        description:
          'The cryptocurrency asset to monitor (e.g., ETH, BTC, SOL)',
        default: 'ETH',
      },
      {
        displayName: 'Condition',
        name: 'condition',
        type: PropertyType.OPTIONS,
        required: true,
        description: 'The price condition to monitor',
        default: 'above',
        options: [
          { name: 'Above', value: 'above' },
          { name: 'Below', value: 'below' },
          { name: 'Equals', value: 'equals' },
          { name: 'Change', value: 'change' },
        ],
      },
      {
        displayName: 'Target Price',
        name: 'targetPrice',
        type: PropertyType.NUMBER,
        required: true,
        description: 'The target price to compare against',
        default: 0,
      },
      {
        displayName: 'Data Source',
        name: 'dataSource',
        type: PropertyType.OPTIONS,
        description: 'The price data source to use',
        default: 'coingecko',
        options: [
          { name: 'CoinGecko', value: 'coingecko' },
          { name: 'CoinMarketCap', value: 'coinmarketcap' },
          { name: 'Binance', value: 'binance' },
        ],
      },
      {
        displayName: 'Check Interval',
        name: 'checkInterval',
        type: PropertyType.NUMBER,
        description: 'How often to check the price (in minutes)',
        default: 5,
      },
    ],
  };

  async execute(
    context: EnhancedBlockExecutionContext,
  ): Promise<ZyraNodeData[]> {
    const { logger, getNodeParameter } = context;
    const nodeId = context.nodeId;
    const executionId = context.executionId;
    const userId = context.userId;

    logger.log(`Executing Price Monitor block: ${nodeId}`);

    try {
      // Get configuration parameters
      const asset = getNodeParameter('asset') || 'ETH';
      const condition = getNodeParameter('condition') || 'above';
      const targetPrice = Number(getNodeParameter('targetPrice')) || 0;
      const dataSource = getNodeParameter('dataSource') || 'coingecko';

      // Validate required fields
      if (!asset) {
        throw new Error('Asset is required');
      }

      // Get price data
      const priceData = await this.getCurrentPrice(asset, dataSource);

      // Check if condition is met
      const conditionMet = this.evaluateCondition(
        priceData.price,
        condition,
        targetPrice,
      );

      // Log the price check
      await this.logPriceCheck(userId, executionId, nodeId, {
        currency: asset,
        currentPrice: priceData.price,
        condition: condition,
        threshold: targetPrice,
        conditionMet,
        timestamp: new Date().toISOString(),
      });

      // Create output data in enhanced format
      const outputData = {
        asset: asset,
        currentPrice: priceData.price,
        targetPrice: targetPrice,
        condition: condition,
        triggered: conditionMet,
        timestamp: new Date().toISOString(),
        dataSource: dataSource,

        // Legacy format for backward compatibility
        currency: asset,
        formattedPrice: `$${priceData.price.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        threshold: targetPrice,
        conditionMet,
        price: priceData.price,
        formatted: {
          price: `$${priceData.price.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          currency: asset,
        },
      };

      logger.log(
        `Price monitor execution completed: ${asset} = $${priceData.price}, condition met: ${conditionMet}`,
      );

      return [
        {
          json: outputData,
          pairedItem: { item: 0 },
        },
      ];
    } catch (error: any) {
      logger.error(`Price monitoring failed: ${error.message}`);

      // Log failed price check
      await this.logPriceCheck(userId, executionId, nodeId, {
        currency: getNodeParameter('asset') || 'unknown',
        status: 'failed',
        error: error.message,
      });

      throw error;
    }
  }

  private async getCurrentPrice(
    currency: string,
    dataSource: string,
  ): Promise<{ price: number }> {
    try {
      // Map UI asset symbols to CoinGecko IDs
      const coinGeckoId = this.mapAssetToCoinGeckoId(currency);

      // Use CoinGecko API for price data
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoId}&vs_currencies=usd`,
        {
          timeout: 10000,
        },
      );

      const price = response.data[coinGeckoId]?.usd;
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

  /**
   * Map UI asset symbols to CoinGecko IDs
   */
  private mapAssetToCoinGeckoId(asset: string): string {
    const mapping: Record<string, string> = {
      ETH: 'ethereum',
      ETHEREUM: 'ethereum',
      BTC: 'bitcoin',
      BITCOIN: 'bitcoin',
      SOL: 'solana',
      SOLANA: 'solana',
      USDC: 'usd-coin',
      USDT: 'tether',
      TETHER: 'tether',
      ADA: 'cardano',
      CARDANO: 'cardano',
      DOGE: 'dogecoin',
      DOGECOIN: 'dogecoin',
      MATIC: 'matic-network',
      POLYGON: 'matic-network',
      LINK: 'chainlink',
      UNI: 'uniswap',
      AAVE: 'aave',
      MKR: 'maker',
    };

    return mapping[asset.toUpperCase()] || asset.toLowerCase();
  }

  private evaluateCondition(
    currentPrice: number,
    condition: string,
    threshold: number,
  ): boolean {
    switch (condition) {
      case 'above':
        return currentPrice > threshold;
      case 'below':
        return currentPrice < threshold;
      case 'equals':
        return Math.abs(currentPrice - threshold) < 0.01; // Allow small difference
      case 'change':
        // For change condition, we'd need historical data
        // For now, return false and log a warning
        this.logger.warn('Change condition not fully implemented yet');
        return false;
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
      await this.databaseService.executions.addNodeLog(
        executionId,
        nodeId,
        'info',
        'Price check completed',
        data,
      );
    } catch (error) {
      this.logger.error('Failed to log price check:', error);
    }
  }

  async validate(config: Record<string, any>): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!config.asset) {
      errors.push('Asset is required');
    }

    if (!config.condition) {
      errors.push('Condition is required');
    }

    if (config.targetPrice === undefined || config.targetPrice === null) {
      errors.push('Target price is required');
    }

    // Validate condition values
    const validConditions = ['above', 'below', 'equals', 'change'];
    if (config.condition && !validConditions.includes(config.condition)) {
      errors.push(
        `Invalid condition: ${config.condition}. Must be one of: ${validConditions.join(', ')}`,
      );
    }

    // Validate data source
    const validDataSources = ['coingecko', 'coinmarketcap', 'binance'];
    if (config.dataSource && !validDataSources.includes(config.dataSource)) {
      errors.push(
        `Invalid data source: ${config.dataSource}. Must be one of: ${validDataSources.join(', ')}`,
      );
    }

    // Warnings
    if (config.targetPrice && Number(config.targetPrice) <= 0) {
      warnings.push('Target price should be greater than 0');
    }

    if (config.checkInterval && Number(config.checkInterval) < 1) {
      warnings.push('Check interval should be at least 1 minute');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
