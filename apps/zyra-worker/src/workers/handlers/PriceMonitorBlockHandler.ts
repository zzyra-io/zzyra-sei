
import { fetchCryptoPrice, PriceData } from '../../lib/services/price-service';
import retry from 'async-retry';

import { BlockExecutionContext, BlockHandler } from '@zyra/types';


export class PriceMonitorBlockHandler implements BlockHandler {
  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const cfg = (node.data as any).config;
    const asset = cfg.asset;
    const targetPrice = Number(cfg.targetPrice);
    const condition = cfg.condition;

    const priceData: PriceData = await retry(
      async () => fetchCryptoPrice(asset),
      {
        retries: 3,
        factor: 2,
      },
    );
    const current = priceData.price;
    let conditionMet = false;
    switch (condition) {
      case 'above':
        conditionMet = current > targetPrice;
        break;
      case 'below':
        conditionMet = current < targetPrice;
        break;
      case 'equals':
        conditionMet = Math.abs(current - targetPrice) < 0.01;
        break;
      default:
        throw new Error(`Unknown condition: ${condition}`);
    }

    return {
      asset,
      currentPrice: current,
      targetPrice,
      condition,
      conditionMet,
      timestamp: priceData.timestamp,
    };
  }
}
