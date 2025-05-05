import { BlockType } from '@/types/workflow';
import { DefiBlockType } from '@/types/defi-blocks';

/**
 * Map workflow block types to DeFi block types
 */
export function mapWorkflowBlockToDefiBlock(blockType: BlockType): DefiBlockType {
  switch (blockType) {
    case BlockType.DEFI_PRICE_MONITOR:
      return DefiBlockType.PRICE_MONITOR;
    case BlockType.DEFI_YIELD_MONITOR:
      return DefiBlockType.YIELD_MONITOR;
    case BlockType.DEFI_PORTFOLIO:
      return DefiBlockType.PORTFOLIO_BALANCE;
    case BlockType.DEFI_REBALANCE:
      return DefiBlockType.REBALANCE_CALCULATOR;
    case BlockType.DEFI_SWAP:
      return DefiBlockType.SWAP_EXECUTOR;
    case BlockType.DEFI_GAS:
      return DefiBlockType.GAS_OPTIMIZER;
    case BlockType.DEFI_PROTOCOL:
      return DefiBlockType.PROTOCOL_MONITOR;
    case BlockType.DEFI_YIELD_STRATEGY:
      return DefiBlockType.YIELD_STRATEGY;
    case BlockType.DEFI_LIQUIDITY:
      return DefiBlockType.LIQUIDITY_PROVIDER;
    case BlockType.DEFI_POSITION:
      return DefiBlockType.POSITION_MANAGER;
    default:
      throw new Error(`Unsupported block type: ${blockType}`);
  }
}

/**
 * Map DeFi block types to workflow block types
 */
export function mapDefiBlockToWorkflowBlock(defiBlockType: DefiBlockType): BlockType {
  switch (defiBlockType) {
    case DefiBlockType.PRICE_MONITOR:
      return BlockType.DEFI_PRICE_MONITOR;
    case DefiBlockType.YIELD_MONITOR:
      return BlockType.DEFI_YIELD_MONITOR;
    case DefiBlockType.PORTFOLIO_BALANCE:
      return BlockType.DEFI_PORTFOLIO;
    case DefiBlockType.REBALANCE_CALCULATOR:
      return BlockType.DEFI_REBALANCE;
    case DefiBlockType.SWAP_EXECUTOR:
      return BlockType.DEFI_SWAP;
    case DefiBlockType.GAS_OPTIMIZER:
      return BlockType.DEFI_GAS;
    case DefiBlockType.PROTOCOL_MONITOR:
      return BlockType.DEFI_PROTOCOL;
    case DefiBlockType.YIELD_STRATEGY:
      return BlockType.DEFI_YIELD_STRATEGY;
    case DefiBlockType.LIQUIDITY_PROVIDER:
      return BlockType.DEFI_LIQUIDITY;
    case DefiBlockType.POSITION_MANAGER:
      return BlockType.DEFI_POSITION;
    default:
      throw new Error(`Unsupported DeFi block type: ${defiBlockType}`);
  }
}
